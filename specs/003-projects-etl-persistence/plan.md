# Implementation Plan: Projects ETL Persistence

**Branch**: `003-projects-etl-persistence` | **Date**: 2026-03-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-projects-etl-persistence/spec.md`

## Summary

Persist job postings from HuggingFace (and future sources) into PostgreSQL so the Projects page loads in under 3 seconds. Implement ETL pipeline with domain filter, scheduled ingestion, deduplication, and job status tracking. Align with `docs/todos/autobidder-etl-rag-schema-spec.md` for schema and flow.

## Technical Context

**Language/Version**: Python 3.12+ (backend), TypeScript/Next.js 16 (frontend)
**Primary Dependencies**: FastAPI, SQLAlchemy/asyncpg, HuggingFace datasets, APScheduler
**Storage**: PostgreSQL (existing), pgvector (future RAG)
**Testing**: pytest (backend), Vitest/Playwright (frontend)
**Target Platform**: Linux/macOS server (Docker), Vercel (frontend)
**Project Type**: Web application (backend + frontend)
**Performance Goals**: Projects page load < 3s, search/filter < 2s, ingestion 95% success
**Constraints**: API response < 2s p95 for list/stats, no external fetch on page load
**Scale/Scope**: ~10K jobs in DB, weekly HF refresh, 100+ concurrent users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) is a template with placeholders. No explicit gates are defined. Assumed principles:

- **Modularity**: ETL, domain filter, and API layers are separable
- **Testability**: ETL runs and API endpoints must be unit/integration testable
- **Backward compatibility**: Projects API response shape preserved for frontend

**Post-Phase 1**: Data model and contracts must not break existing Projects page or proposals flow.

## Project Structure

### Documentation (this feature)

```text
specs/003-projects-etl-persistence/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── projects-api.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── etl/                    # NEW: ETL module
│   │   ├── __init__.py
│   │   ├── domain_filter.py    # Domain filter per ETL spec
│   │   ├── hf_loader.py        # HuggingFace loader + normalize
│   │   ├── job_service.py       # Insert/upsert jobs to DB
│   │   └── scheduler.py        # APScheduler jobs
│   ├── models/
│   │   └── job.py              # NEW: Job, ETLRun models
│   ├── routers/
│   │   └── projects.py         # MODIFY: Read from DB, not HF
│   └── services/
│       └── hf_job_source.py    # MODIFY: Used by ETL, not directly by API
└── tests/
    ├── unit/
    │   └── etl/                # NEW: ETL unit tests
    └── integration/
        └── test_projects_api.py # MODIFY: Test DB-backed list

frontend/
├── src/
│   ├── app/(dashboard)/projects/
│   │   └── page.tsx            # No change; API contract preserved
│   └── lib/api/client.ts       # No change
└── tests/                      # Existing

database/
└── migrations/
    └── 007_jobs_etl_runs.sql   # NEW: jobs, etl_runs, user_job_status
```

**Structure Decision**: Web app with backend (FastAPI) and frontend (Next.js). ETL runs in backend process. New `etl/` module keeps ETL logic separate from API routers.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New `jobs` table alongside `projects` | ETL spec defines global jobs; projects was user-scoped and empty | Reusing projects would require schema changes and conflict with ETL spec's jobs design |
| `user_job_status` junction table | Per-user pipeline (reviewed, applied) on global jobs | Storing status on jobs would require user_id on jobs, breaking global pool |
