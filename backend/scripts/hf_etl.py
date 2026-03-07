#!/usr/bin/env python3
"""
HuggingFace ETL Script

Loads jobs from HuggingFace datasets, applies domain filter, and optionally:
- Loads to PostgreSQL (default when DATABASE_URL is set)
- Saves to JSON file (--output)

For cron/Airflow. Run from backend: cd backend && uv run python scripts/hf_etl.py

Usage:
    cd backend && uv run python scripts/hf_etl.py --dataset-id jacob-hugging-face/job-descriptions --limit 200
    cd backend && uv run python scripts/hf_etl.py --keywords "python,fastapi" --limit 50
    cd backend && uv run python scripts/hf_etl.py --output data/scraped/hf_$(date +%Y%m%d).json --no-db
"""

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Script lives in backend/scripts/; ensure app is importable
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))
os.chdir(BACKEND_DIR)
try:
    from dotenv import load_dotenv
    load_dotenv(BACKEND_DIR / ".env")
except ImportError:
    pass


async def main() -> None:
    parser = argparse.ArgumentParser(
        description="HuggingFace ETL: load, filter, optionally save to JSON or load to PostgreSQL"
    )
    parser.add_argument(
        "--dataset-id",
        type=str,
        default=os.getenv("HF_DATASET_ID", "jacob-hugging-face/job-descriptions"),
        help="HuggingFace dataset ID",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=int(os.getenv("HF_JOB_LIMIT", "200")),
        help="Max jobs to fetch",
    )
    parser.add_argument(
        "--keywords",
        type=str,
        help="Comma-separated keywords for filtering",
    )
    parser.add_argument(
        "--output",
        type=str,
        help="Save to JSON file (no DB write)",
    )
    parser.add_argument(
        "--no-db",
        action="store_true",
        help="Do not load to PostgreSQL (only --output or print)",
    )
    args = parser.parse_args()

    keywords = None
    if args.keywords:
        keywords = [k.strip() for k in args.keywords.split(",") if k.strip()]

    from app.etl.hf_loader import load_and_filter_hf_jobs

    records, extracted, filtered = load_and_filter_hf_jobs(
        dataset_id=args.dataset_id,
        limit=args.limit,
        keyword_filter=keywords,
    )

    print(f"Extracted: {extracted}, Filtered: {filtered}")

    if args.output:
        Path(args.output).parent.mkdir(parents=True, exist_ok=True)
        data = {
            "metadata": {
                "source": "hf_etl",
                "dataset_id": args.dataset_id,
                "timestamp": datetime.now().isoformat(),
                "count": len(records),
            },
            "jobs": [
                {
                    "platform": r.platform,
                    "external_id": r.external_id,
                    "title": r.title,
                    "description": r.description[:500] + "..." if len(r.description) > 500 else r.description,
                    "skills": r.skills_required,
                    "budget_min": r.budget_min,
                    "budget_max": r.budget_max,
                    "employer_name": r.employer_name,
                }
                for r in records
            ],
        }
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        print(f"Saved to {args.output}")

    if not args.no_db and os.getenv("DATABASE_URL"):
        from app.services.job_service import record_etl_run, upsert_jobs

        started = datetime.now(timezone.utc)
        inserted, updated = 0, 0
        if records:
            inserted, updated = await upsert_jobs(records, etl_source=args.dataset_id)
        completed = datetime.now(timezone.utc)
        await record_etl_run(
            source="hf_etl_script",
            started_at=started,
            completed_at=completed,
            status="success",
            jobs_extracted=extracted,
            jobs_filtered=filtered,
            jobs_inserted=inserted,
            jobs_updated=updated,
        )
        print(f"Loaded to PostgreSQL: inserted={inserted}, updated={updated}")
    elif not args.no_db and not os.getenv("DATABASE_URL"):
        print("DATABASE_URL not set; skipping DB load. Use --no-db to suppress.")


if __name__ == "__main__":
    asyncio.run(main())
