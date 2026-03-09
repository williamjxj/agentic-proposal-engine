# Implementation Plan: Filter Projects by Keywords

**Branch**: `006-filter-projects-by-keywords` | **Date**: 2026-03-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-filter-projects-by-keywords/spec.md`

## Summary

Apply an OR-keyword filter before displaying projects on the Projects page. Scraping and ETL remain unchanged—they ingest all datasets. Filtering happens at query time: only projects matching at least one configured keyword (in title, description, or skills) are returned. User keywords (existing `keywords` table) serve as the default filter when no search override is provided. System-level fallback (env) supports users with no keywords.

## Technical Context

**Language/Version**: Python 3.12+, TypeScript/Next.js 16  
**Primary Dependencies**: FastAPI, asyncpg, Next.js App Router, TanStack Query  
**Storage**: PostgreSQL (`projects`, `keywords` tables from existing migrations)  
**Testing**: pytest (backend), existing frontend patterns  
**Target Platform**: Linux server (Docker), Next.js frontend  
**Project Type**: Web application (backend + frontend)  
**Performance Goals**: Projects list response under 3 seconds (aligned with 003 spec)  
**Constraints**: No changes to ETL/scraping; filtering at read path only  
**Scale/Scope**: Same as 003—multi-tenant, per-user keywords; existing fulltext/GIN indexes support keyword queries

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

No project-specific constitution file (template only). Using workspace rules:

- **Python best practices**: Type annotations, docstrings, pytest, Ruff
- **Next.js/Tailwind**: Frontend with shadcn/ui
- **Error handling**: Services throw user-friendly errors

**Gates**: PASS (no constitution violations)

## Project Structure

### Documentation (this feature)

```text
specs/006-filter-projects-by-keywords/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (projects-api keywords extension)
└── tasks.md             # Phase 2 output (/speckit.tasks - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── services/
│   │   ├── project_service.py   # Extend: keyword filter, skills_required in OR, default from keywords table
│   │   └── keyword_service.py   # Existing: list user keywords
│   ├── routers/
│   │   └── projects.py          # Extend: resolve filter keywords (user or system fallback)
│   └── core/
│       └── config.py             # Optional: PROJECT_FILTER_KEYWORDS env
└── tests/
    └── unit/
        └── services/
            └── test_project_service_keyword_filter.py   # New tests

frontend/
└── src/
    └── app/(dashboard)/projects/
        └── page.tsx             # Optional: prefill search from user keywords
```

**Structure Decision**: Web application. Changes are localized to `project_service.list_projects`, projects router, and optionally frontend. Reuse existing `keywords` table and `keyword_service` for user-configured filter keywords.
