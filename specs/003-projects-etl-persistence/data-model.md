# Data Model: Projects ETL Persistence

**Feature**: 003-projects-etl-persistence  
**Spec**: [spec.md](./spec.md)  
**Reference**: [autobidder-etl-rag-schema-spec.md](../../docs/todos/autobidder-etl-rag-schema-spec.md)

## Overview

This feature introduces a `jobs` table as the source of truth for job postings, populated by ETL from HuggingFace datasets. The existing `projects` table is deprecated in favor of `jobs`; the Projects API will read from `jobs` and return data in the shape expected by the frontend. Per-user pipeline status (reviewed, applied) is tracked via `user_job_status`.

## Entity Relationship Summary

```
┌─────────────┐     ┌──────────────────┐     ┌────────────┐
│   users     │─────│  user_job_status │─────│    jobs     │
└─────────────┘     │  (user_id,      │     └──────┬─────┘
       │            │   job_id,       │            │
       │            │   status)       │            │
       │            └──────────────────┘            │
       │                    │                       │
       │                    │                       │
       ▼                    ▼                       ▼
┌─────────────┐     ┌──────────────────┐     ┌────────────┐
│  proposals  │─────│  job_id (FK)     │     │  etl_runs  │
└─────────────┘     └──────────────────┘     └────────────┘
```

## Core Entities

### jobs (new)

Global job postings from ETL. Replaces in-memory HuggingFace fetches.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| platform | job_platform | NOT NULL | upwork, freelancer, huggingface_dataset, other |
| external_id | TEXT | NOT NULL | Platform's job ID |
| fingerprint_hash | TEXT | UNIQUE NOT NULL | SHA256(platform + external_id) for dedup |
| external_url | TEXT | | Original posting URL |
| category | job_category | NOT NULL | ai_ml, web_development, fullstack_engineering, etc. |
| title | TEXT | NOT NULL | Job title |
| description | TEXT | NOT NULL | Full description |
| skills_required | TEXT[] | | Normalized skill names |
| budget_min | NUMERIC(12,2) | | Min budget |
| budget_max | NUMERIC(12,2) | | Max budget |
| budget_currency | CHAR(3) | DEFAULT 'USD' | Currency |
| employer_name | TEXT | | Company/client name |
| status | job_status | DEFAULT 'new' | new, matched, archived, expired |
| etl_source | TEXT | | e.g. hf_loader, upwork_scheduler |
| posted_at | TIMESTAMPTZ | | When job was posted |
| scraped_at | TIMESTAMPTZ | DEFAULT NOW() | When ingested |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes**: platform, category, status, posted_at DESC, fingerprint_hash (unique), GIN(skills_required), full-text on title||description

**Validation**: fingerprint_hash must be unique; external_id + platform must not duplicate.

---

### user_job_status (new)

Per-user pipeline status for jobs. Enables "my reviewed", "my applied" views.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Primary key |
| user_id | UUID | FK users(id), NOT NULL | User |
| job_id | UUID | FK jobs(id), NOT NULL | Job |
| status | VARCHAR(20) | NOT NULL | reviewed, applied |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Unique**: (user_id, job_id) — one status per user per job.

**Status values**: `reviewed` (user looked at it), `applied` (user has sent or will send proposal). "Applied" can also be inferred from proposals.job_id for full traceability.

---

### etl_runs (new)

Audit trail for each ETL execution (FR-009).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | SERIAL | PK | Primary key |
| source | TEXT | NOT NULL | hf_loader, upwork, etc. |
| started_at | TIMESTAMPTZ | DEFAULT NOW() | |
| completed_at | TIMESTAMPTZ | | |
| status | TEXT | | running, success, failed |
| jobs_extracted | INT | DEFAULT 0 | |
| jobs_filtered | INT | DEFAULT 0 | Passed domain filter |
| jobs_inserted | INT | DEFAULT 0 | New rows |
| jobs_updated | INT | DEFAULT 0 | Updated rows |
| error_message | TEXT | | |
| metadata | JSONB | | |

---

### proposals (existing, extend)

Add `job_id` FK to link proposals to persisted jobs (FR-010). Current schema uses job_url, job_platform; add optional job_id for traceability.

| New/Changed | Type | Description |
|-------------|------|-------------|
| job_id | UUID | FK jobs(id), NULLABLE | Link to persisted job |

---

### projects (existing, deprecated)

The `projects` table remains in DB for migration compatibility but is no longer written to by ETL. The Projects API will read from `jobs` and return data in the existing response shape. Projects table can be dropped in a future migration after proposals are fully migrated to job_id.

## Enums

```sql
CREATE TYPE job_platform AS ENUM (
  'upwork', 'freelancer', 'linkedin', 'toptal', 'guru',
  'remoteok', 'remotive', 'huggingface_dataset', 'other'
);

CREATE TYPE job_category AS ENUM (
  'ai_ml', 'web_development', 'fullstack_engineering',
  'devops_mlops', 'cloud_infrastructure',
  'software_outsourcing', 'ui_design', 'other'
);

CREATE TYPE job_status AS ENUM (
  'new', 'matched', 'archived', 'expired'
);
```

## State Transitions

### job.status (global)

- `new` → default when inserted
- `new` → `archived` when aged out (e.g. 30 days)
- `new` → `expired` when deadline passed (if applicable)

### user_job_status.status (per user)

- (none) → `reviewed` when user marks as reviewed
- (none) | `reviewed` → `applied` when user marks as applied or creates proposal for job

## Mapping: jobs → API Response

The Projects API returns jobs in the shape expected by the frontend. Mapping:

| API field | jobs column |
|-----------|-------------|
| id | jobs.id (or external_id for backward compat) |
| title | jobs.title |
| description | jobs.description |
| company | jobs.employer_name |
| platform | jobs.platform |
| skills | jobs.skills_required |
| budget.min | jobs.budget_min |
| budget.max | jobs.budget_max |
| posted_at | jobs.posted_at |
| source | jobs.etl_source |
| status | user_job_status.status if exists, else jobs.status |

## Migration Strategy

1. Create `jobs`, `etl_runs`, `user_job_status` tables.
2. Add `job_id` to `proposals` (nullable).
3. Run initial HuggingFace ETL to populate `jobs`.
4. Update Projects router: list/discover/stats read from `jobs` instead of `fetch_hf_jobs()`.
5. Discover flow: fetch from HF, upsert into `jobs`, return.
6. Status update endpoint: write to `user_job_status` (or update jobs.status if global).
7. Deprecate `projects` writes; keep table for any legacy references until proposals migration complete.
