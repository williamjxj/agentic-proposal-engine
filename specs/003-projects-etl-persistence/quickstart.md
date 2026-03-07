# Quickstart: Projects ETL Persistence (003)

**Branch**: `003-projects-etl-persistence`  
**Goal**: Fast Projects page via persisted jobs, scheduled HuggingFace ingestion, domain filter, status tracking.

## Prerequisites

- Python 3.12+, Node 20+
- PostgreSQL with pgvector (Docker Compose)
- HuggingFace `datasets` library

## 1. Database Migration

Run the jobs + etl_runs migration:

```bash
# From repo root (run 008 for jobs/etl_runs, 009 for job_id on proposals)
psql $DATABASE_URL -f database/migrations/008_jobs_etl_runs.sql
psql $DATABASE_URL -f database/migrations/009_add_job_id_to_proposals.sql
```

Or via Alembic/uv if migrations are managed:

```bash
cd backend && uv run alembic upgrade head
```

## 2. Environment Variables

Add to `backend/.env`:

```env
# ETL
USE_HF_DATASET=true
HF_DATASET_ID=jacob-hugging-face/job-descriptions
HF_JOB_LIMIT=200
HF_ETL_SCHEDULE_HOURS=168   # Weekly (optional, for scheduler)
ETL_USE_PERSISTENCE=true    # Read/write from DB instead of live HF fetch
```

## 3. Run Initial Ingestion

Trigger a one-time HuggingFace ingestion to populate jobs:

```bash
cd backend
uv run python -c "
from app.etl.hf_loader import run_hf_ingestion
import asyncio
asyncio.run(run_hf_ingestion())
"
```

Or call the API (when implemented):

```bash
curl -X POST http://localhost:8000/api/etl/trigger \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source": "hf_loader"}'
```

## 4. Start Backend

```bash
cd backend
uv run uvicorn app.main:app --reload
```

## 5. Start Frontend

```bash
cd frontend
npm run dev
```

## 6. Verify

1. Open `/projects` — jobs should load in under 3 seconds.
2. Use Search and filters — results from database.
3. Click "Discover Jobs" with keywords — new jobs persist and appear on next load.
4. Update a job status — change persists across sessions.

## Key Paths

| Component | Path |
|-----------|------|
| Domain filter | `backend/app/etl/domain_filter.py` |
| HF loader | `backend/app/etl/hf_loader.py` |
| ETL scheduler | `backend/app/etl/scheduler.py` |
| Projects router | `backend/app/routers/projects.py` |
| Jobs service | `backend/app/services/job_service.py` |

## Troubleshooting

- **Empty list**: Run initial ingestion (step 3). Ensure `ETL_USE_PERSISTENCE=true`.
- **Slow page**: Verify API reads from DB; check `source: "database"` in list response.
- **Duplicates**: Check `fingerprint_hash` uniqueness; re-ingestion should upsert.
