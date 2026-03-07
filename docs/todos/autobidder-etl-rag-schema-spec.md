# Autobidder — ETL Pipeline, RAG Embedding & Database Schema Spec
**Project**: `agentic-proposal-engine`  
**Version**: 2.0 — Autonomous Agentic Edition  
**Date**: 2026-03-06

---

## 1. Domain Filter — What Gets Ingested

All scraping, HuggingFace dataset loading, and web resource indexing **must pass this domain filter** before any data enters the pipeline. Anything outside these categories is discarded at extraction time — never written to DB or embedded into RAG.

### 1.1 Allowed Categories & Keywords

```python
# backend/app/etl/domain_filter.py

ALLOWED_DOMAINS = {
    "ai_ml": [
        "machine learning", "deep learning", "LLM", "GPT", "RAG", "AI agent",
        "NLP", "computer vision", "MLOps", "fine-tuning", "transformer",
        "LangChain", "LangGraph", "OpenAI", "Claude", "Gemini", "vector database",
        "embedding", "AI engineer", "AI consultant", "generative AI", "agentic AI"
    ],
    "web_development": [
        "React", "Next.js", "Vue", "Angular", "TypeScript", "JavaScript",
        "frontend", "backend", "REST API", "GraphQL", "full-stack", "web developer",
        "Node.js", "FastAPI", "Django", "Flask", "web application"
    ],
    "fullstack_engineering": [
        "full stack", "fullstack", "software engineer", "software developer",
        "senior engineer", "tech lead", "architect", "API development",
        "microservices", "SaaS", "platform engineer"
    ],
    "devops_mlops": [
        "DevOps", "MLOps", "CI/CD", "GitHub Actions", "Jenkins", "Kubernetes",
        "Docker", "container", "Helm", "ArgoCD", "Terraform", "Ansible",
        "infrastructure as code", "IaC", "pipeline", "deployment", "SRE"
    ],
    "cloud_infrastructure": [
        "AWS", "Azure", "GCP", "Google Cloud", "cloud architect", "cloud engineer",
        "cloud native", "serverless", "Lambda", "EC2", "S3", "CloudFormation",
        "cloud migration", "hybrid cloud", "cloud consultant", "infrastructure"
    ],
    "software_outsourcing": [
        "contract", "freelance", "outsource", "remote contract", "consultant",
        "software contractor", "IT contractor", "project basis", "hourly contract",
        "fixed price", "staff augmentation", "offshore", "nearshore"
    ],
    "ui_design": [
        "UI design", "UX design", "Figma", "product design", "design system",
        "user interface", "user experience", "wireframe", "prototype",
        "interaction design", "visual design", "UI/UX"
    ]
}

# Minimum match threshold: at least 1 keyword from ANY category must match
def passes_domain_filter(text: str) -> tuple[bool, str]:
    """Returns (passes, matched_category)"""
    text_lower = text.lower()
    for category, keywords in ALLOWED_DOMAINS.items():
        if any(kw.lower() in text_lower for kw in keywords):
            return True, category
    return False, ""
```

---

## 2. Data Sources & ETL Architecture

### 2.1 Source Inventory

| Source | Type | Method | Schedule | Priority |
|---|---|---|---|---|
| Upwork | Live job platform | Official API + Playwright fallback | Every 30 min | P0 |
| Freelancer.com | Live job platform | REST API | Every 30 min | P0 |
| LinkedIn Jobs | Live job platform | Playwright stealth scraper | Every 60 min | P1 |
| Toptal | Curated contracts | Playwright scraper | Every 4 hours | P1 |
| Guru.com | Job platform | REST API | Every 60 min | P2 |
| HuggingFace Datasets | Static/versioned | `datasets` library | Weekly refresh | P1 |
| GitHub Jobs corpus | Historical | `datasets` library | One-time seed | P2 |
| RemoteOK / Remotive | Remote jobs board | RSS + REST API | Every 2 hours | P2 |

### 2.2 HuggingFace Datasets — Filtered Ingestion

```python
# backend/app/etl/hf_loader.py
from datasets import load_dataset
from .domain_filter import passes_domain_filter

HF_DATASETS = [
    # Job descriptions corpus
    {"name": "jacob-hugging-face/job-descriptions",     "split": "train", "text_col": "job_description"},
    # Tech skills taxonomy
    {"name": "allenai/WizardLM_evol_instruct_V2_196k", "split": "train", "text_col": "conversations"},
    # Freelance proposal samples (if available)
    {"name": "nguha/legalbench",                         "split": "train", "text_col": "text"},
]

async def load_and_filter_hf_datasets():
    filtered_records = []
    for ds_config in HF_DATASETS:
        dataset = load_dataset(ds_config["name"], split=ds_config["split"], streaming=True)
        for record in dataset:
            text = record.get(ds_config["text_col"], "")
            passes, category = passes_domain_filter(text)
            if passes:
                filtered_records.append({
                    "source": "huggingface",
                    "dataset": ds_config["name"],
                    "category": category,
                    "text": text[:4000],  # cap at 4k chars per record
                    "metadata": {col: record[col] for col in record if col != ds_config["text_col"]}
                })
    return filtered_records
```

### 2.3 ETL Pipeline — Full Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     ETL ORCHESTRATOR                             │
│              (APScheduler / Celery Beat)                         │
└──────┬──────────────────────┬───────────────────────────────────┘
       │                      │
       ↓ EXTRACT              ↓ EXTRACT (HuggingFace / static)
┌─────────────┐        ┌─────────────────┐
│  Live Scrapers│        │  HF Dataset     │
│  Upwork API  │        │  Loader         │
│  Playwright  │        │  (weekly batch) │
└──────┬───────┘        └───────┬─────────┘
       └──────────┬─────────────┘
                  ↓ TRANSFORM
┌─────────────────────────────────────────────────────────────────┐
│                    TRANSFORM LAYER                               │
│  1. Domain filter (discard non-matching)                         │
│  2. Normalize schema → JobRecord                                 │
│  3. Deduplicate (fingerprint hash: platform+external_id)         │
│  4. Enrich: skill extraction, budget normalization, category tag │
│  5. Quality score (completeness check)                           │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓ LOAD (dual-write)
           ┌───────────────┴───────────────┐
           ↓                               ↓
   ┌───────────────┐               ┌───────────────┐
   │  PostgreSQL    │               │  ChromaDB      │
   │  (Supabase)    │               │  (RAG Index)   │
   │                │               │                │
   │  jobs table    │               │  jobs collection│
   │  raw metadata  │               │  + embeddings  │
   │  status cols   │               │  + metadata    │
   └───────────────┘               └───────────────┘
```

### 2.4 ETL Scheduler Setup

```python
# backend/app/scheduler.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

scheduler = AsyncIOScheduler()

# High-frequency live job scraping
scheduler.add_job(run_upwork_etl,     IntervalTrigger(minutes=30), id="upwork_etl")
scheduler.add_job(run_freelancer_etl, IntervalTrigger(minutes=30), id="freelancer_etl")
scheduler.add_job(run_linkedin_etl,   IntervalTrigger(minutes=60), id="linkedin_etl")
scheduler.add_job(run_remoteok_etl,   IntervalTrigger(hours=2),   id="remoteok_etl")

# Low-frequency static dataset refresh
scheduler.add_job(run_hf_etl,         IntervalTrigger(weeks=1),   id="hf_etl")

# Cleanup: archive jobs older than 30 days
scheduler.add_job(archive_stale_jobs, IntervalTrigger(hours=24),  id="cleanup")
```

---

## 3. RAG Embedding Strategy

### 3.1 What Gets Embedded (and How)

```
Two ChromaDB collections:

  jobs_index          ← live job postings (refreshed continuously)
  knowledge_base      ← portfolio docs, HF data, past proposals (refreshed weekly)
```

```python
# backend/app/etl/embedder.py
import chromadb
from langchain_openai import OpenAIEmbeddings

embedder = OpenAIEmbeddings(model="text-embedding-3-small")  # 1536-dim, cost-effective

def build_job_document(job: dict) -> str:
    """Construct the text representation to embed for a job."""
    return f"""
    Title: {job['title']}
    Category: {job['category']}
    Skills Required: {', '.join(job['skills_required'])}
    Description: {job['description'][:1500]}
    Budget: {job['budget_min']} - {job['budget_max']} {job['budget_currency']}
    Contract Type: {job['contract_type']}
    Platform: {job['platform']}
    """.strip()

async def embed_job_to_rag(job: dict, collection_name: str = "jobs_index"):
    client = chromadb.PersistentClient(path="./chroma_db")
    collection = client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"}
    )
    doc_text = build_job_document(job)
    collection.upsert(
        ids=[job["fingerprint_hash"]],
        documents=[doc_text],
        metadatas=[{
            "job_id":        str(job["id"]),
            "platform":      job["platform"],
            "category":      job["category"],
            "budget_min":    job["budget_min"] or 0,
            "budget_max":    job["budget_max"] or 0,
            "contract_type": job["contract_type"],
            "posted_at":     job["posted_at"].isoformat(),
        }]
    )
```

### 3.2 Embedding Quality Rules

- **Max chunk size**: 1500 chars per job description (truncate beyond — noise hurts retrieval)
- **Upsert not insert**: always use `upsert` so re-runs don't create duplicates
- **Metadata filtering**: agents filter by `category`, `budget_min`, `platform` before semantic search
- **Winning proposals**: embed accepted proposals into `knowledge_base` collection with `outcome: "won"` tag — these become the highest-value RAG context

---

## 4. Database Schema — Full Redesign

### 4.1 Schema Principles

- PostgreSQL is the **source of truth** — ChromaDB is derived from it
- Every job has a `chroma_indexed` flag — ETL sets this after successful embedding
- Schemas are normalized around the **software outsourcing/contractor** domain
- All monetary values stored as `NUMERIC(12,2)` with explicit currency

### 4.2 Complete SQL Schema

```sql
-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE job_platform AS ENUM (
  'upwork', 'freelancer', 'linkedin', 'toptal', 'guru',
  'remoteok', 'remotive', 'huggingface_dataset', 'other'
);

CREATE TYPE job_category AS ENUM (
  'ai_ml', 'web_development', 'fullstack_engineering',
  'devops_mlops', 'cloud_infrastructure',
  'software_outsourcing', 'ui_design', 'other'
);

CREATE TYPE contract_type AS ENUM (
  'hourly', 'fixed_price', 'retainer', 'full_time_contract', 'part_time_contract'
);

CREATE TYPE experience_level AS ENUM (
  'entry', 'intermediate', 'expert', 'any'
);

CREATE TYPE job_status AS ENUM (
  'new', 'matched', 'proposal_drafted', 'proposal_sent',
  'under_review', 'won', 'lost', 'archived', 'expired'
);

CREATE TYPE proposal_status AS ENUM (
  'draft', 'pending_review', 'approved', 'sent', 'won', 'lost', 'withdrawn'
);

CREATE TYPE submission_method AS ENUM (
  'api', 'playwright_automation', 'manual'
);


-- ============================================================
-- USERS / PROFILES
-- ============================================================

CREATE TABLE user_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name      TEXT,
  hourly_rate_min   NUMERIC(8,2),
  hourly_rate_max   NUMERIC(8,2),
  rate_currency     CHAR(3) DEFAULT 'USD',
  preferred_contract_types  contract_type[],
  preferred_categories      job_category[],
  timezone          TEXT DEFAULT 'UTC',
  availability      TEXT,               -- e.g. "40h/week", "part-time"
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);


-- ============================================================
-- SKILLS TAXONOMY
-- ============================================================

CREATE TABLE skills (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,               -- e.g. "React", "Kubernetes", "LangChain"
  category    job_category NOT NULL,
  aliases     TEXT[],                             -- alternative names
  is_active   BOOLEAN DEFAULT true
);


-- ============================================================
-- JOBS (Core table — fed by ETL)
-- ============================================================

CREATE TABLE jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source identity
  platform          job_platform NOT NULL,
  external_id       TEXT NOT NULL,                -- platform's own job ID
  external_url      TEXT,
  fingerprint_hash  TEXT NOT NULL UNIQUE,         -- SHA256(platform + external_id)

  -- Categorization
  category          job_category NOT NULL,
  subcategory       TEXT,                         -- e.g. "React + FastAPI fullstack"
  tags              TEXT[],                       -- free-form tags from platform

  -- Content
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  description_html  TEXT,                         -- raw HTML if available
  skills_required   TEXT[],                       -- normalized skill names
  skills_preferred  TEXT[],

  -- Contract details
  contract_type     contract_type,
  experience_level  experience_level DEFAULT 'any',
  duration_weeks    INT,                          -- estimated contract length
  hours_per_week    INT,

  -- Budget
  budget_min        NUMERIC(12,2),
  budget_max        NUMERIC(12,2),
  budget_currency   CHAR(3) DEFAULT 'USD',
  is_hourly         BOOLEAN DEFAULT false,

  -- Employer
  employer_name     TEXT,
  employer_country  CHAR(2),                      -- ISO 3166-1 alpha-2
  employer_rating   NUMERIC(3,2),                 -- 0.00 to 5.00
  employer_reviews  INT,
  employer_spent    NUMERIC(14,2),                -- total platform spend by employer

  -- ETL metadata
  status            job_status DEFAULT 'new',
  match_score       NUMERIC(5,4),                 -- 0.0000 to 1.0000
  quality_score     NUMERIC(5,4),                 -- completeness of data
  chroma_indexed    BOOLEAN DEFAULT false,         -- has been embedded into RAG
  etl_source        TEXT,                         -- e.g. "upwork_scheduler", "hf_loader"
  raw_payload       JSONB,                         -- original scraped data

  -- Timestamps
  posted_at         TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  scraped_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common agent queries
CREATE INDEX idx_jobs_platform        ON jobs(platform);
CREATE INDEX idx_jobs_category        ON jobs(category);
CREATE INDEX idx_jobs_status          ON jobs(status);
CREATE INDEX idx_jobs_match_score     ON jobs(match_score DESC);
CREATE INDEX idx_jobs_posted_at       ON jobs(posted_at DESC);
CREATE INDEX idx_jobs_chroma_indexed  ON jobs(chroma_indexed) WHERE chroma_indexed = false;
CREATE INDEX idx_jobs_skills          ON jobs USING GIN(skills_required);


-- ============================================================
-- KNOWLEDGE BASE DOCUMENTS
-- (Portfolio docs, case studies, past work — for RAG context)
-- ============================================================

CREATE TABLE knowledge_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  doc_type        TEXT NOT NULL,   -- 'portfolio', 'case_study', 'team_profile', 'resume', 'past_proposal'
  category        job_category,    -- which domain this doc is relevant to
  skills_covered  TEXT[],
  chroma_id       TEXT,            -- ChromaDB document ID
  chroma_indexed  BOOLEAN DEFAULT false,
  file_url        TEXT,            -- Supabase Storage URL
  outcome         TEXT,            -- 'won', 'lost', null (for past proposals)
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- PROPOSALS
-- ============================================================

CREATE TABLE proposals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id            UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Generated content
  content           TEXT NOT NULL,               -- full proposal text
  cover_letter      TEXT,                        -- short intro paragraph
  proposed_rate     NUMERIC(10,2),
  proposed_currency CHAR(3) DEFAULT 'USD',
  estimated_hours   INT,
  delivery_days     INT,

  -- AI generation metadata
  model_used        TEXT DEFAULT 'gpt-4-turbo',
  rag_docs_used     TEXT[],                      -- ChromaDB doc IDs used as context
  confidence_score  NUMERIC(5,4),               -- 0–1, drives auto-send decision
  generation_tokens INT,
  prompt_version    TEXT,                        -- bidding strategy template ID

  -- Status & workflow
  status            proposal_status DEFAULT 'draft',
  auto_send_eligible BOOLEAN DEFAULT false,      -- true if confidence >= threshold
  review_required   BOOLEAN DEFAULT true,

  -- Outcome tracking
  employer_response TEXT,
  outcome_notes     TEXT,

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_proposals_job_id    ON proposals(job_id);
CREATE INDEX idx_proposals_user_id   ON proposals(user_id);
CREATE INDEX idx_proposals_status    ON proposals(status);
CREATE INDEX idx_proposals_confidence ON proposals(confidence_score DESC);


-- ============================================================
-- SUBMISSIONS
-- (Tracks every auto-send or manual send attempt)
-- ============================================================

CREATE TABLE submissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id       UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  job_id            UUID NOT NULL REFERENCES jobs(id),
  user_id           UUID NOT NULL REFERENCES auth.users(id),

  method            submission_method NOT NULL,
  platform          job_platform NOT NULL,
  submitted_at      TIMESTAMPTZ DEFAULT NOW(),

  -- Result
  success           BOOLEAN,
  platform_response JSONB,                       -- raw API or Playwright response
  error_message     TEXT,
  retry_count       INT DEFAULT 0,

  -- Auto-send gate
  confidence_score  NUMERIC(5,4),               -- snapshot at time of send
  auto_approved     BOOLEAN DEFAULT false
);

CREATE INDEX idx_submissions_proposal_id ON submissions(proposal_id);
CREATE INDEX idx_submissions_user_id     ON submissions(user_id);
CREATE INDEX idx_submissions_platform    ON submissions(platform);


-- ============================================================
-- BIDDING STRATEGIES (Prompt Templates)
-- ============================================================

CREATE TABLE bidding_strategies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  category        job_category,                 -- which domain this strategy is for
  system_prompt   TEXT NOT NULL,                -- LLM system prompt
  user_prompt_tpl TEXT NOT NULL,                -- Jinja2 / f-string template
  tone            TEXT DEFAULT 'professional',  -- 'professional', 'casual', 'technical'
  is_default      BOOLEAN DEFAULT false,
  win_rate        NUMERIC(5,4),                 -- updated from outcomes
  use_count       INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- USER KEYWORDS (Domain-specific filter per user)
-- ============================================================

CREATE TABLE user_keywords (
  id          SERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword     TEXT NOT NULL,
  category    job_category,
  weight      INT DEFAULT 1,            -- higher = more important in matching
  is_excluded BOOLEAN DEFAULT false,    -- true = blocklist keyword
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, keyword)
);


-- ============================================================
-- ETL RUN LOG
-- (Audit trail for every ETL execution)
-- ============================================================

CREATE TABLE etl_runs (
  id              SERIAL PRIMARY KEY,
  source          TEXT NOT NULL,            -- 'upwork', 'freelancer', 'hf_loader', etc.
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  status          TEXT,                     -- 'running', 'success', 'failed'
  jobs_extracted  INT DEFAULT 0,
  jobs_filtered   INT DEFAULT 0,            -- passed domain filter
  jobs_inserted   INT DEFAULT 0,            -- new to DB
  jobs_updated    INT DEFAULT 0,
  jobs_embedded   INT DEFAULT 0,            -- written to ChromaDB
  error_message   TEXT,
  metadata        JSONB
);


-- ============================================================
-- ANALYTICS / OUTCOMES
-- ============================================================

CREATE TABLE proposal_outcomes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id     UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  job_id          UUID NOT NULL REFERENCES jobs(id),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  outcome         TEXT NOT NULL,            -- 'won', 'lost', 'no_response', 'withdrawn'
  response_time_h INT,                      -- hours from send to employer response
  contract_value  NUMERIC(12,2),            -- actual contract value if won
  currency        CHAR(3) DEFAULT 'USD',
  feedback        TEXT,                     -- employer feedback if any
  recorded_at     TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Agent Access Pattern — How Agents Use DB + RAG

```python
# backend/app/agents/matcher_agent.py
# This is how the Matcher Agent queries BOTH stores simultaneously

async def find_matching_jobs(user_profile: dict, top_k: int = 20) -> list[dict]:

    # Step 1: Semantic search in ChromaDB (RAG)
    chroma_results = jobs_collection.query(
        query_texts=[build_profile_query(user_profile)],
        n_results=top_k * 2,
        where={
            "$and": [
                {"category": {"$in": user_profile["preferred_categories"]}},
                {"budget_min": {"$gte": user_profile["hourly_rate_min"]}},
            ]
        }
    )
    candidate_ids = [m["job_id"] for m in chroma_results["metadatas"][0]]

    # Step 2: Structured filter in PostgreSQL (DB)
    # Combine semantic candidates with hard business rules
    jobs = await db.fetch("""
        SELECT j.*, p.content as past_proposal_content
        FROM jobs j
        LEFT JOIN proposals p ON p.job_id = j.id AND p.status = 'won'
        WHERE j.id = ANY($1)
          AND j.status = 'new'
          AND j.expires_at > NOW()
          AND j.budget_max >= $2
          AND j.skills_required && $3   -- array overlap with user skills
        ORDER BY j.match_score DESC
        LIMIT $4
    """, candidate_ids, user_profile["hourly_rate_min"],
         user_profile["skills"], top_k)

    return jobs
```

---

## 6. Implementation Priority

| Phase | What to Build | Effort |
|---|---|---|
| **1** | DB schema migration (this spec) | 1–2 days |
| **2** | Domain filter module + ETL normalize layer | 2–3 days |
| **3** | APScheduler + Upwork/Freelancer ETL jobs | 3–4 days |
| **4** | HuggingFace filtered loader + weekly refresh | 1–2 days |
| **5** | ChromaDB dual-write with upsert + `chroma_indexed` sync | 2 days |
| **6** | LangGraph agent nodes consuming DB + RAG | 1 week |
| **7** | Auto-send submission layer + confidence gate | 3–4 days |

---

*This spec supersedes earlier architecture notes. PostgreSQL remains source of truth; ChromaDB is always derived. Domain filter is enforced at extraction time — garbage in, garbage out.*
