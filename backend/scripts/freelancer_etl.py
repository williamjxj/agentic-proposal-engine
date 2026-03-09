#!/usr/bin/env python3
"""
Freelancer ETL Script

Scrapes Freelancer.com and/or loads from JSON, applies domain filter, and optionally:
- Loads to PostgreSQL (default when DATABASE_URL is set)
- Saves to JSON file (--scrape-only or --output)

NOTE (006/FR-004): Keyword filtering for Projects list is NOT applied during ingestion.
Filtering by user/system keywords happens only in project_service.list_projects at list time.

For cron/Airflow. Run from backend: cd backend && uv run python scripts/freelancer_etl.py

Usage:
    cd backend && uv run python scripts/freelancer_etl.py --keywords "python,fastapi" --limit 20
    cd backend && uv run python scripts/freelancer_etl.py --load-from ../data/scraped/freelancer_20260305_151834.json
    cd backend && uv run python scripts/freelancer_etl.py --scrape-only --keywords "python" --limit 10
"""

import argparse
import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Script lives in backend/scripts/; ensure app + freelancer_scraper are importable
BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))  # for freelancer_scraper
os.chdir(BACKEND_DIR)
try:
    from dotenv import load_dotenv
    load_dotenv(BACKEND_DIR / ".env")
except ImportError:
    pass


async def main() -> None:
    parser = argparse.ArgumentParser(
        description="Freelancer ETL: scrape and/or load from JSON, filter, optionally load to PostgreSQL"
    )
    parser.add_argument(
        "--keywords",
        type=str,
        default="python,fastapi",
        help="Comma-separated keywords (for scrape)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=20,
        help="Max results to scrape",
    )
    parser.add_argument(
        "--load-from",
        type=str,
        help="Load from existing JSON file (from freelancer_scraper) instead of scraping",
    )
    parser.add_argument(
        "--scrape-only",
        action="store_true",
        help="Only scrape and save to JSON; do not load to DB",
    )
    parser.add_argument(
        "--output",
        type=str,
        help="Output JSON path (default: data/scraped/freelancer_YYYYMMDD_HHMMSS.json)",
    )
    parser.add_argument(
        "--no-headless",
        action="store_true",
        help="Run browser in non-headless mode",
    )
    args = parser.parse_args()

    jobs: list = []

    if args.load_from:
        from app.etl.freelancer_loader import load_jobs_from_json_file

        jobs = load_jobs_from_json_file(args.load_from)
        print(f"Loaded {len(jobs)} jobs from {args.load_from}")
    else:
        from freelancer_scraper import FreelancerScraper

        keywords = [k.strip() for k in args.keywords.split(",") if k.strip()]
        scraper = FreelancerScraper(headless=not args.no_headless)
        jobs = await scraper.scrape(keywords=keywords or ["python"], max_results=args.limit)
        print(f"Scraped {len(jobs)} jobs")

        if jobs and (args.scrape_only or args.output):
            out_dir = PROJECT_ROOT / "data" / "scraped"
            out_dir.mkdir(parents=True, exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            out_path = args.output or str(out_dir / f"freelancer_{timestamp}.json")
            data = {
                "metadata": {
                    "source": "freelancer_etl",
                    "keywords": keywords,
                    "timestamp": datetime.now().isoformat(),
                    "count": len(jobs),
                },
                "jobs": jobs,
            }
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4)
            print(f"Saved to {out_path}")

    if args.scrape_only:
        return

    if not jobs:
        print("No jobs to load.")
        return

    if os.getenv("DATABASE_URL"):
        from app.etl.freelancer_loader import run_freelancer_ingestion

        result = await run_freelancer_ingestion(
            jobs=jobs,
            etl_source="freelancer_etl_script",
        )
        print(
            f"Loaded to PostgreSQL: inserted={result['jobs_inserted']}, "
            f"updated={result['jobs_updated']}"
        )
    else:
        print("DATABASE_URL not set; skipping DB load.")


if __name__ == "__main__":
    asyncio.run(main())
