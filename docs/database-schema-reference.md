# Auto-Bidder Database Schema Reference

Purpose, relationships, and workflows for all PostgreSQL tables.

---

## 1. Table Overview

| Table | Purpose |
|-------|---------|
| **users** | User accounts (auth, email, password) |
| **user_profiles** | Extended user data (subscription, preferences, onboarding) |
| **jobs** | Job listings from ETL (HuggingFace, Freelancer, etc.) — source of truth for Projects UI |
| **etl_runs** | ETL pipeline run history (source, counts, status) |
| **user_job_status** | Per-user status on jobs (new, reviewed, applied, rejected) |
| **projects** | User-saved/curated projects (legacy or alternate workflow) |
| **keywords** | User-defined search keywords for job matching |
| **bidding_strategies** | AI proposal generation configs (prompts, tone, temperature) |
| **proposals** | Generated proposals linked to jobs and strategies |
| **bids** | Bid submissions linked to projects |
| **knowledge_base_documents** | User-uploaded docs for RAG (portfolio, case studies) |
| **draft_work** | Auto-saved drafts (proposals, etc.) |
| **user_session_states** | Session context (active feature, navigation, filters) |
| **scraping_jobs** | Scraping task queue (platform, search terms, status) |
| **platform_credentials** | Stored API keys/tokens for Upwork, Freelancer, etc. |
| **workflow_analytics** | Workflow event metrics (duration, success) |
| **analytics_events** | User behavior events (event_type, event_data) |

---

## 2. Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o| user_profiles : "has"
    users ||--o{ keywords : "owns"
    users ||--o{ bidding_strategies : "owns"
    users ||--o{ proposals : "creates"
    users ||--o{ bids : "creates"
    users ||--o{ user_job_status : "tracks"
    users ||--o{ projects : "owns"
    users ||--o{ knowledge_base_documents : "uploads"
    users ||--o{ draft_work : "has"
    users ||--o{ user_session_states : "has"
    users ||--o{ scraping_jobs : "triggers"
    users ||--o{ platform_credentials : "stores"
    users ||--o{ workflow_analytics : "generates"
    users ||--o{ analytics_events : "generates"

    jobs ||--o{ user_job_status : "tracked by"
    jobs ||--o{ proposals : "targeted by"

    bidding_strategies ||--o{ proposals : "used by"
    bidding_strategies ||--o{ bids : "used by"

    projects ||--o{ bids : "receives"

    users {
        uuid id PK
        varchar email
        varchar password_hash
        varchar full_name
        boolean is_active
    }

    jobs {
        uuid id PK
        text fingerprint_hash UK
        text platform
        text external_id
        text category
        text title
        text description
        numeric budget_min
        numeric budget_max
        text etl_source
    }

    user_job_status {
        uuid id PK
        uuid user_id FK
        uuid job_id FK
        varchar status
    }

    proposals {
        uuid id PK
        uuid user_id FK
        uuid job_id FK
        uuid strategy_id FK
        text title
        text description
        varchar status
    }

    etl_runs {
        int id PK
        text source
        timestamptz started_at
        timestamptz completed_at
        varchar status
        int jobs_inserted
        int jobs_updated
    }
```

---

## 3. Core Workflows

### 3.1 ETL Pipeline Flow

```mermaid
flowchart TB
    subgraph Sources
        HF[HuggingFace Datasets]
        FL[Freelancer Scraper]
    end

    subgraph ETL["ETL Layer"]
        EXTRACT[Extract]
        FILTER[Domain Filter]
        NORM[Normalize → JobRecord]
        DEDUP[Deduplicate fingerprint_hash]
    end

    subgraph Load
        UPSERT[(upsert_jobs)]
        RECORD[(record_etl_run)]
    end

    HF --> EXTRACT
    FL --> EXTRACT
    EXTRACT --> FILTER
    FILTER --> NORM
    NORM --> DEDUP
    DEDUP --> UPSERT
    UPSERT --> RECORD

    UPSERT --> jobs[(jobs table)]
    RECORD --> etl_runs[(etl_runs table)]
```

### 3.2 Job Discovery & Proposal Flow

```mermaid
sequenceDiagram
    participant U as User
    participant API as Projects API
    participant DB as PostgreSQL
    participant AI as AI Service

    U->>API: POST /projects/discover (keywords)
    API->>DB: list_jobs / upsert from HF
    DB-->>API: jobs
    API-->>U: discovered jobs

    U->>API: GET /projects/list
    API->>DB: list_jobs (with user_job_status)
    DB-->>API: jobs + status
    API-->>U: projects list

    U->>API: Create proposal for job
    API->>AI: generate proposal (strategy + job context)
    AI-->>API: draft proposal
    API->>DB: INSERT proposals
    U->>API: Submit proposal
    API->>DB: UPDATE user_job_status (applied)
```

### 3.3 User-Centric Data Flow

```mermaid
flowchart LR
    subgraph User["User (users)"]
        U[users]
    end

    subgraph Discovery["Discovery & Matching"]
        K[keywords]
        JS[user_job_status]
    end

    subgraph Content["Content Creation"]
        BS[bidding_strategies]
        P[proposals]
        B[bids]
    end

    subgraph Persistence["Persistence"]
        DW[draft_work]
        KB[knowledge_base_documents]
    end

    subgraph Context["Context & Analytics"]
        USS[user_session_states]
        WA[workflow_analytics]
        AE[analytics_events]
    end

    U --> K
    U --> JS
    U --> BS
    U --> P
    U --> B
    U --> DW
    U --> KB
    U --> USS
    U --> WA
    U --> AE

    jobs[(jobs)] -.->|"tracked by"| JS
    jobs -.->|"targeted by"| P
```

---

## 4. Table Details

### 4.1 Core Tables

#### `users`
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| email | varchar | Login identifier |
| password_hash | varchar | Bcrypt hash |
| full_name | varchar | Display name |
| is_active | boolean | Account enabled |
| is_verified | boolean | Email verified |
| last_login_at | timestamptz | Last login |

**Relationships:** Referenced by all user-scoped tables via `user_id`.

---

#### `jobs`
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| fingerprint_hash | text | Unique dedup key (platform + external_id) |
| platform | enum | upwork, freelancer, huggingface_dataset, etc. |
| external_id | text | Platform's job ID |
| category | enum | ai_ml, web_development, fullstack_engineering, etc. |
| title | text | Job title |
| description | text | Full description |
| skills_required | text[] | Required skills |
| budget_min, budget_max | numeric | Budget range |
| employer_name | text | Client name |
| etl_source | text | ETL source (hf_loader, freelancer_scheduler, etc.) |
| posted_at | timestamptz | When job was posted |

**Purpose:** Central job catalog. Fed by ETL (HF, Freelancer). Projects UI reads from here when `ETL_USE_PERSISTENCE=true`.

---

#### `etl_runs`
| Column | Type | Purpose |
|--------|------|---------|
| id | int | Primary key |
| source | text | hf_etl_script, freelancer_scheduler, etc. |
| started_at, completed_at | timestamptz | Run window |
| status | text | success, failed, running |
| jobs_extracted | int | Raw count before filter |
| jobs_filtered | int | After domain filter |
| jobs_inserted, jobs_updated | int | DB write counts |
| error_message | text | On failure |

**Purpose:** Audit trail for ETL pipeline runs.

---

#### `user_job_status`
| Column | Type | Purpose |
|--------|------|---------|
| user_id | uuid | FK → users |
| job_id | uuid | FK → jobs |
| status | varchar | new, reviewed, applied, rejected |

**Purpose:** Per-user status on each job (e.g., "applied" when user submits proposal).

---

### 4.2 Proposal & Bidding Tables

#### `bidding_strategies`
| Column | Type | Purpose |
|--------|------|---------|
| user_id | uuid | FK → users |
| name | varchar | Strategy name |
| system_prompt | text | AI prompt template |
| tone | varchar | Professional, friendly, etc. |
| temperature, max_tokens | numeric/int | LLM params |
| is_default | boolean | Default for user |

**Purpose:** AI proposal generation configs.

---

#### `proposals`
| Column | Type | Purpose |
|--------|------|---------|
| user_id | uuid | FK → users |
| job_id | uuid | FK → jobs |
| strategy_id | uuid | FK → bidding_strategies |
| title, description | text | Proposal content |
| status | varchar | draft, sent, won, lost |
| generated_with_ai | boolean | AI-generated flag |

**Purpose:** Proposals created for jobs, optionally using a strategy.

---

#### `bids`
| Column | Type | Purpose |
|--------|------|---------|
| project_id | uuid | FK → projects |
| user_id | uuid | FK → users |
| strategy_id | uuid | FK → bidding_strategies |
| proposal, cover_letter | text | Bid content |
| bid_amount | numeric | Proposed price |
| ai_generated | boolean | AI-generated flag |
| status | varchar | draft, submitted, won, lost |

**Purpose:** Bid submissions for projects (may align with proposals in future).

---

### 4.3 Supporting Tables

| Table | Purpose |
|-------|---------|
| **keywords** | User search keywords; `jobs_matched`, `last_match_at` for tracking |
| **projects** | User-saved projects (alternate to jobs; may be legacy) |
| **knowledge_base_documents** | Uploaded docs for RAG; `chroma_collection_name`, `chunk_count` |
| **draft_work** | Auto-saved drafts; `entity_type` + `entity_id` polymorphic |
| **user_session_states** | Session context; `active_feature`, `navigation_history`, `filters` |
| **scraping_jobs** | Scraping tasks; `platform`, `search_terms`, `status` |
| **platform_credentials** | API keys for Upwork, Freelancer; encrypted storage |
| **workflow_analytics** | Workflow events; `event_type`, `duration_ms`, `success` |
| **analytics_events** | User events; `event_type`, `event_data`, `session_id` |

---

## 5. ETL Entry Points

```mermaid
flowchart TB
    subgraph UI["From UI (Backend Running)"]
        Scheduler[APScheduler]
        Trigger[POST /api/etl/trigger]
        Scheduler --> HF_Job[HF ETL Job]
        Scheduler --> FL_Job[Freelancer ETL Job]
        Trigger --> HF_Job
        Trigger --> FL_Job
    end

    subgraph CLI["From CLI (Cron / Airflow)"]
        HF_Script[scripts/hf_etl.py]
        FL_Script[scripts/freelancer_etl.py]
    end

    HF_Job --> jobs
    FL_Job --> jobs
    HF_Script --> jobs
    FL_Script --> jobs
```

---

## 6. Quick Reference: FK Summary

| Child Table | Parent | FK Column |
|-------------|--------|-----------|
| user_profiles | users | user_id |
| keywords | users | user_id |
| bidding_strategies | users | user_id |
| proposals | users | user_id |
| proposals | jobs | job_id |
| proposals | bidding_strategies | strategy_id |
| bids | projects | project_id |
| bids | users | user_id |
| bids | bidding_strategies | strategy_id |
| user_job_status | users | user_id |
| user_job_status | jobs | job_id |
| projects | users | user_id |
| knowledge_base_documents | users | user_id |
| draft_work | users | user_id |
| user_session_states | users | user_id |
| scraping_jobs | users | user_id |
| platform_credentials | users | user_id |
| workflow_analytics | users | user_id |
| analytics_events | users | user_id |

---

*Generated from Auto-Bidder schema. See `docs/todos/autobidder-etl-rag-schema-spec.md` for full ETL/RAG spec.*
