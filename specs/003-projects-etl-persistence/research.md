# Research: Projects ETL Persistence

**Feature**: 003-projects-etl-persistence  
**Date**: 2026-03-06  
**Status**: Complete

## 1. Schema Alignment: projects vs jobs

### Decision

Introduce a new `jobs` table (global, ETL-fed) per `autobidder-etl-rag-schema-spec.md`. Keep the existing `projects` table for backward compatibility during migration but route Projects API reads from `jobs`. Add `user_job_status` for per-user pipeline tracking (reviewed, applied).

### Rationale

- **ETL spec**: Defines `jobs` as the core table with `fingerprint_hash`, `platform`, `external_id`, `category`, full-text search, etc. PostgreSQL is source of truth.
- **Current state**: `projects` table exists but is empty; has `user_id` (user-scoped). Projects router fetches from HuggingFace on every request.
- **Feature spec**: "Job data is shared across users (global job pool)". User-specific views use status and filters.
- **Proposals**: ETL spec has `proposals.job_id` → `jobs.id`. Current proposals use `job_url`, `job_platform` (no FK). We add `job_id` (nullable FK) for linkage.

### Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| Extend `projects` only | No new table | Schema doesn't match ETL spec; `user_id` conflicts with global pool |
| Replace `projects` with `jobs` | Clean break | Breaking change; bids/proposals reference projects |
| New `jobs` + deprecate `projects` | Aligns with ETL | Requires migration of any projects data (currently none) |

### Implementation Approach

- Create `jobs` table (per ETL spec Section 4.2).
- Create `etl_runs` table for ingestion audit.
- Create `user_job_status` (user_id, job_id, status) for per-user pipeline (reviewed, applied).
- Projects API: `GET /list` and `GET /stats` read from `jobs`. Response shape unchanged for frontend.
- Discover flow: Fetch from HF → apply domain filter → upsert into `jobs` → return.

---

## 2. Scheduler for HuggingFace Ingestion

### Decision

Use APScheduler (AsyncIOScheduler) with `IntervalTrigger(weeks=1)` for HuggingFace dataset refresh. Support manual trigger via API for Discover flow and initial seed.

### Rationale

- **ETL spec Section 2.4**: APScheduler for HF weekly batch. Live scrapers (Upwork, Freelancer) are future work.
- **Existing stack**: Backend is FastAPI (async). APScheduler has `AsyncIOScheduler` for async jobs.
- **Discover flow**: User-triggered; runs synchronously in request handler, then upserts to DB. No scheduler needed for that path.

### Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| Celery Beat | Production-grade, distributed | Heavier; requires Redis/broker; overkill for single-instance HF weekly job |
| Cron + script | Simple, external | Less integrated; no in-process visibility |
| APScheduler | Lightweight, in-process, async | Single-instance only; fine for MVP |

---

## 3. Domain Filter Implementation

### Decision

Implement `passes_domain_filter(text) -> (bool, category)` per ETL spec Section 1.1. Categories: ai_ml, web_development, fullstack_engineering, devops_mlops, cloud_infrastructure, software_outsourcing, ui_design. Minimum: 1 keyword match from any category.

### Rationale

- **ETL spec**: Domain filter is mandatory at extraction time. "Garbage in, garbage out."
- **Keyword lists**: Spec provides concrete keyword lists per category. Use as-is for consistency.
- **Integration point**: HF loader and Discover flow both call domain filter before persisting.

### Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| No filter | Simpler | Irrelevant jobs clutter DB; poor UX |
| LLM-based classification | Flexible | Cost, latency, non-deterministic |
| Keyword-based (chosen) | Fast, deterministic, spec-aligned | May miss edge cases; keywords need maintenance |

---

## 4. ChromaDB / RAG Embedding

### Decision

Defer ChromaDB dual-write to a later phase. This feature focuses on: (1) persist jobs to PostgreSQL, (2) fast Projects page from DB, (3) domain filter, (4) scheduled HF ingestion. RAG embedding (ETL spec Phase 5) is out of scope for 003.

### Rationale

- **Spec success criteria**: SC-001 (page load < 3s), SC-002 (search < 2s) are achievable with PostgreSQL + indexes alone.
- **Scope**: Feature spec does not require semantic search or RAG for MVP.
- **ETL spec Phase 5**: ChromaDB dual-write is a separate implementation phase.

---

## 5. Deduplication Strategy

### Decision

Use `fingerprint_hash = SHA256(platform + external_id)` as unique key. Upsert on `fingerprint_hash`; re-ingestion updates existing row.

### Rationale

- **ETL spec**: `fingerprint_hash TEXT NOT NULL UNIQUE` in jobs table.
- **HF datasets**: `external_id` from normalized job (or hash of title+description). Platform = `huggingface_dataset`.
- **Concurrent writes**: Discover + scheduled ingestion can run concurrently; upsert is idempotent.

---

## 6. User Status Tracking (reviewed, applied)

### Decision

Add `user_job_status` table: (user_id, job_id, status, created_at). Status values: `reviewed`, `applied`. "Applied" can also be inferred from `proposals.job_id` when we add that FK. For MVP, `user_job_status` is the source of truth for pipeline view.

### Rationale

- **Feature spec FR-005**: Job status workflow new, reviewed, applied, won, lost, archived.
- **Global jobs**: `jobs.status` is ETL-level (new, expired, etc.). User-level status is per-user.
- **Proposals**: When user creates proposal from job, we can set `user_job_status.status = 'applied'` and add `proposals.job_id`. Keeps both in sync.

### Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| jobs.status only | Simple | Can't support per-user pipeline (multiple users, same job) |
| user_job_status (chosen) | Per-user, clear semantics | Extra table |
| proposals as source of "applied" | No extra table | Doesn't cover "reviewed"; proposal may be draft |

---

## 7. API Compatibility with Frontend

### Decision

Maintain existing Projects API contract. `GET /api/projects/list` and `GET /api/projects/stats` return the same response shape. `POST /api/projects/discover` returns same shape. Add `PUT /api/projects/{id}/status` implementation (currently returns 404) to update `user_job_status`.

### Rationale

- **Spec dependency**: "Existing Projects page UI and API contracts; changes must remain compatible."
- **Frontend**: Uses `listProjects`, `getProjectStats`, `discoverProjects`. Response includes `jobs`, `total`, `page`, `pages`, `limit`, `source`, `dataset_id`.
- **Mapping**: Map `jobs` table rows to current Project response shape (title, description, company, skills, budget, platform, etc.).

---

## Summary of Resolved Items

| Topic | Decision |
|-------|----------|
| Schema | New `jobs` table; `user_job_status` for per-user pipeline |
| Scheduler | APScheduler, weekly HF refresh |
| Domain filter | Keyword-based per ETL spec |
| ChromaDB | Deferred |
| Deduplication | fingerprint_hash upsert |
| API | Backward compatible |
