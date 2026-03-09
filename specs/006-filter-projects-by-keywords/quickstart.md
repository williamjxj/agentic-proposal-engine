# Quickstart: Filter Projects by Keywords (006)

**Branch**: `006-filter-projects-by-keywords`  
**Goal**: Projects list filtered by OR keywords (title, description, skills). Scraping unchanged.

## Prerequisites

- 003-projects-etl-persistence complete (projects in DB, ETL running)
- `keywords` table populated (optional—user keywords)
- Python 3.12+, PostgreSQL

## 1. Environment (Optional)

Add to `backend/.env` for system-level default when user has no keywords:

```env
# Comma-separated default filter keywords (used when user has none)
PROJECT_FILTER_KEYWORDS=python,fastapi,agentic ai,react,ai
```

## 2. User Keywords

Users configure keywords at `/keywords`. Active keywords (`is_active=true`) are used as the default filter when listing projects.

If `search` is omitted on `/api/projects/list`:
1. Use user's active keywords
2. Else use `PROJECT_FILTER_KEYWORDS` env
3. Else show all projects

## 3. Verify

1. Add keywords at `/keywords` (e.g., python, fastapi)
2. Open `/projects` — only projects matching any keyword appear
3. Clear search input — filter still applied (from user keywords)
4. Type in search box — overrides with your terms
5. ETL/Discover — still ingests all jobs; filter applies only at list time

## Key Paths

| Component | Path |
|-----------|------|
| List filter logic | `backend/app/services/project_service.py` (list_projects) |
| Keyword resolution | `backend/app/routers/projects.py` (list_projects) |
| User keywords | `backend/app/services/keyword_service.py` |

## Contract

- `specs/006-filter-projects-by-keywords/contracts/projects-list-keyword-filter.yaml`
