# ETL Scheduler Guide

Two ways to run ETL ingestion: **from the UI** or **from CLI scripts** (for cron/Airflow).

---

## 1. From the UI (Backend Running)

When the backend is running with `ETL_USE_PERSISTENCE=true`:

### Automatic scheduled runs
- **HF datasets**: Runs every `HF_ETL_SCHEDULE_HOURS` (default 168 = weekly)
- **Freelancer**: Runs every `FREELANCER_ETL_SCHEDULE_HOURS` (default 24 = daily)

The scheduler starts automatically on backend startup. No extra setup.

### Manual trigger
```bash
curl -X POST http://localhost:8000/api/etl/trigger \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source": "hf_loader"}'
# or
  -d '{"source": "freelancer_loader"}'
```

Returns `202 Accepted`; ingestion runs in the background.

### View run history
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/etl/runs?limit=20"
```

---

## 2. From CLI Scripts (Cron / Airflow)

Run ETL without the backend. Use for cron jobs or Airflow DAGs.

### HuggingFace ETL
```bash
# From backend directory (uses backend venv)
cd backend && uv run python scripts/hf_etl.py --dataset-id jacob-hugging-face/job-descriptions --limit 200

# With keywords
cd backend && uv run python scripts/hf_etl.py --keywords "python,fastapi" --limit 50

# Save to JSON only (no DB)
cd backend && uv run python scripts/hf_etl.py --output data/scraped/hf_$(date +%Y%m%d).json --no-db
```

### Freelancer ETL
```bash
# Scrape + load to PostgreSQL
cd backend && uv run python scripts/freelancer_etl.py --keywords "python,fastapi" --limit 20

# Load from existing JSON file to PostgreSQL
cd backend && uv run python scripts/freelancer_etl.py --load-from ../data/scraped/freelancer_20260305_151834.json

# Scrape only (save to JSON, no DB)
cd backend && uv run python scripts/freelancer_etl.py --scrape-only --keywords "python" --limit 10
```

### Example cron entries
```cron
# HF weekly (Sunday 2am)
0 2 * * 0 cd /path/to/auto-bidder/backend && uv run python scripts/hf_etl.py >> /var/log/hf_etl.log 2>&1

# Freelancer daily (3am)
0 3 * * * cd /path/to/auto-bidder/backend && uv run python scripts/freelancer_etl.py --keywords "python,fastapi,react" >> /var/log/freelancer_etl.log 2>&1
```

---

## Environment

Scripts load `backend/.env`. Ensure `DATABASE_URL` is set for DB writes.

| Variable | Default | Description |
|----------|---------|-------------|
| `ETL_USE_PERSISTENCE` | false | Enable scheduler + DB reads in backend |
| `HF_ETL_SCHEDULE_HOURS` | 168 | HF ingestion interval (hours) |
| `FREELANCER_ETL_SCHEDULE_HOURS` | 24 | Freelancer ingestion interval (hours) |
| `DATABASE_URL` | - | PostgreSQL connection string |
