# Multi-Source Data Adapter Plan for AutoBidder

## Question

1. instead of using .env file: HF_DATASET_ID, replace with HF_DATASET_IDS  which is a array to iterate all the huggingface datasets (more than 1). remember you have to join them into array then to loop processing.
2. besides the huggingface datasets, there is a freelancer data resource, and a manually upload job option.
They all have different data format (different json key/values)
3. the codes should cover all the cases to render all the project data in a general way. e.g. there is a dropdown list in projects page (current already implemented) to allow user to swtich for various dataset. 

## Answer 1

### Core Pattern: Source Adapter Registry
The industry-standard approach (used by Airbyte, Singer/Meltano, dbt sources) is a **Registry of Adapters** — each source gets one adapter class that maps its raw schema → a single canonical `JobRecord`. No `if/elif` chains scattered across the codebase.

---

### 1. Canonical Schema (single target format)
Define one normalized dict/model that every source must produce:

```
title, company, description, requirements, skills[],
budget_min, budget_max, budget_type,
url, location, posted_at,
external_id, platform, source, status
```

Every adapter's only job is mapping raw fields → these fields.

---

### 2. One Adapter Per Source

| Source | Key mapping challenges |
|---|---|
| `jacob-hugging-face/job-descriptions` | `position_title` → `title`, `company_name` → `company`, has unique `model_response` field |
| `lukebarousse/data_jobs` | `job_title_short` → `title`, `job_skills` is a list, `salary_year_avg` → `budget_min`, has `job_location` + `job_country` |
| `datastax/linkedin_job_listings` | `application_url`, `min_salary/max_salary`, `pay_period` (HOURLY/ANNUAL), `listed_at` |
| `freelancer` (scraped JSON) | Already close to canonical; needs `external_id` / `id` resolution |
| `manual_upload` (JSON/CSV) | Unknown schema — use **alias probing**: try 8–10 common column names per field |

---

### 3. Adapter Registry
```python
SOURCE_REGISTRY = {
    "jacob-hugging-face/job-descriptions": JacobHFAdapter(),
    "lukebarousse/data_jobs":              LukeBarousseAdapter(),
    "datastax/linkedin_job_listings":      DatastaxLinkedInAdapter(),
    "freelancer":                          FreelancerAdapter(),
    "manual_upload":                       ManualUploadAdapter(),
    # Any unknown dataset → GenericHFAdapter fallback
}

def get_adapter(source_id: str) -> BaseAdapter:
    return SOURCE_REGISTRY.get(source_id, GenericAdapter(source_id))
```

Adding a new source in future = one new class + one registry line. Nothing else changes.

---

### 4. ManualUploadAdapter — alias probing strategy
For uploads where you don't control the schema, probe common aliases per canonical field:

```python
FIELD_ALIASES = {
  "title":    ["title", "job_title", "position_title", "role", "designation", ...],
  "company":  ["company", "employer", "organization", "client", ...],
  "skills":   ["skills", "job_skills", "tech_stack", "technologies", ...],
  "posted_at":["posted_at", "date_posted", "listed_at", "created_at", ...],
  # etc.
}
```

If skills field is still missing after probing → auto-extract known tech terms from description text as fallback.

---

### 5. Multi-Dataset env var
```dotenv
# New: comma-separated, takes priority over HF_DATASET_ID
HF_DATASET_IDS=jacob-hugging-face/job-descriptions,lukebarousse/data_jobs,datastax/linkedin_job_listings

# Legacy single-dataset still works
HF_DATASET_ID=jacob-hugging-face/job-descriptions
HF_JOB_LIMIT=200                # applied per dataset
HUGGINGFACE_TOKEN=hf_...
```

Resolution priority: `HF_DATASET_IDS` → `HF_DATASET_ID` → hardcoded default.

---

### 6. Files to create/modify

| File | Action |
|---|---|
| `app/etl/source_adapters.py` | **New** — BaseAdapter + all concrete adapters + registry |
| `app/services/hf_job_source.py` | Modify — add `fetch_hf_jobs_multi()`, route each dataset through registry |
| `app/etl/hf_loader.py` | Modify — add `run_hf_ingestion_multi()`, use multi-fetch |
| `app/etl/upload_loader.py` | **New** — parse JSON/JSONL/CSV, call ManualUploadAdapter |
| `app/routers/etl.py` | Modify — add `POST /api/etl/upload`, `POST /api/etl/trigger-multi`, `GET /api/etl/sources` |
| `app/etl/scheduler.py` | Modify — scheduler calls `run_hf_ingestion_multi()` instead of single |
| `app/config.py` | Modify — add `HF_DATASET_IDS`, `HF_JOB_LIMIT`, `hf_dataset_ids_list` property |

---

### 7. Key design decisions

- **`source` field on every record** — tracks which dataset produced each job, critical for debugging and deduplication (`fingerprint = SHA256(platform + external_id)`)
- **Domain filter stays unchanged** — applies after normalization, so all sources pass through the same gate
- **`raw_payload` field** — each `JobRecord` stores the full original record, so source-specific fields (e.g. `model_response`, `pay_period`) are never lost
- **Generic fallback adapter** — probes ~15 common field names so any new HF dataset works immediately without code changes, just possibly with lower accuracy
- **`register_adapter(source_id, adapter)`** — runtime hook for plugins/tests to add sources without modifying the registry file

## Answer 2

The project currently supports pulling job postings from HuggingFace datasets, but relies on hardcoded `if/elif` blocks to map specific dataset formats (like `jacob-hugging-face/job-descriptions`, `lukebarousse/data_jobs`, and generic IT jobs) to a standard internal `Job` schema. 
To support adding new datasets like `datastax/linkedin_job_listings` easily, and to handle a future `freelancer` resource or manual uploads interchangeably, we need a generalized, configurable mapping system instead of hardcoded logic.

The goal is to refactor `hf_job_source.py` to use a declarative mapping or a registry of normalizers, making it trivial to add new datasets by just defining how their fields map to our standard schema.

### Proposed Changes

#### Configuration / Mapping layer

Add a configuration module or dictionary that defines mappings for each known dataset. This mapping will tell the system which fields in the source dataset correspond to which fields in our internal schema.

##### [MODIFY] `backend/app/services/hf_job_source.py`
- Remove the hardcoded `if/elif` blocks in `normalize_hf_job`.
- Introduce a dictionary `DATASET_MAPPINGS` or a similar configuration object.
- Each key in `DATASET_MAPPINGS` will be a dataset ID (e.g., `"datastax/linkedin_job_listings"`).
- The value will be a mapping configuration dict defining how to extract standard fields:
  - `title_fields`: List of possible fields for the job title (e.g., `["title", "job_title", "position_title"]`).
  - `company_fields`: List of possible fields for the company name.
  - `description_fields`: List of possible fields for the description.
  - `requirements_fields`: List of possible fields for requirements.
  - `skills_fields`: List of possible fields for skills.
  - `budget_min_fields`: List of possible fields for minimum budget/salary.
  - `budget_max_fields`: List of possible fields for maximum budget/salary.
  - `url_fields`: List of possible fields for the job URL.
  - `date_fields`: List of possible fields for the posting date.
- Update `normalize_hf_job` to look up the dataset in `DATASET_MAPPINGS`. If found, it uses the defined fields to extract data.
- If a dataset is not in the explicit mappings, it will fall back to a "generic" mapping that checks common field names (e.g., `["title", "job_title", "Company", "description", ...]`), similar to the current fallback logic but driven by the same data structure.
- Extract common logic (like generating MD5 hashes for IDs, parsing skills lists, and cleaning data) into reusable helper functions within the process.
- Map the new dataset `datastax/linkedin_job_listings` using fields like `title`, `company_name`, `description`, `skills_desc`, `min_salary`, `max_salary`, `job_posting_url`, `original_listed_time`/`listed_time`.

##### [MODIFY] `backend/.env`
- Add the new datasets to the commented section or activate them as requested by the user, if not already physically done during execution.

### Verification Plan

#### Automated Tests
1. **Unit tests for normalizer:** If there are existing tests for `hf_job_source.py`, we will run them to ensure the refactored `normalize_hf_job` still correctly processes records from `jacob-hugging-face/job-descriptions` and `lukebarousse/data_jobs`. If no tests exist, we will create a simple test script in `tests/` or evaluate the existing ones.
   - Run `pytest tests/` in the backend directory. *(Note: previous run failed with an asyncio collection error, which we might need to investigate or bypass by running specific test files).*
2. **Local Script Verification:** Create a temporary scratch script that initializes `normalize_hf_job` with sample rows from each supported format (including the new LinkedIn one) to verify output schema compliance without needing a full API call.

#### Manual Verification
1. Start the backend and frontend.
2. In the Projects UI, switch the data source dropdown to `datastax/linkedin_job_listings`.
3. Verify that the projects page loads successfully and displays titles, companies, descriptions, and budgets correctly mapped from the LinkedIn dataset.
4. Switch back to the previous datasets (`jacob-hugging-face/job-descriptions` etc.) to ensure regressions were not introduced.

---

## Summary: Key Points from Both Solutions

**Solution 1 (Registry/Adapter):**
- One canonical JobRecord schema; adapters map raw → canonical
- SOURCE_REGISTRY: one adapter per source
- ManualUploadAdapter: alias probing for unknown schemas
- raw_payload preserves original data

**Solution 2 (Declarative Mapping):**
- DATASET_MAPPINGS: field aliases per source (title_fields, company_fields, etc.)
- Generic fallback checks common column names

**Recommended approach:** Combine both — use adapter classes driven by field-mapping config for consistency and testability.

---

## Solution 3 (Implementation)

1. **Config:** `HF_DATASET_IDS` (comma-separated) takes priority over `HF_DATASET_ID`. Both parsed to list; fallback to single default.
2. **Source adapters:** `app/etl/source_adapters.py` — BaseAdapter, per-source adapters (JacobHF, LukeBarousse, Freelancer, ManualUpload), SOURCE_REGISTRY, alias probing for ManualUpload.
3. **Multi-dataset ingestion:** `run_hf_ingestion_multi()` loops HF_DATASET_IDS, calls `run_hf_ingestion(dataset_id)` per item.
4. **Projects filter:** `list_projects` accepts `dataset_id`; when set: HF id → `etl_source = $1`, `freelancer` → `platform = 'freelancer'`, `manual` → `platform = 'manual'`.
5. **Datasets API:** `get_available_datasets()` returns HF datasets from config + virtual entries for `freelancer`, `manual`.
6. **Manual bulk upload:** `POST /api/etl/upload` — JSON/JSONL/CSV file, ManualUploadAdapter with alias probing, upsert to projects.
