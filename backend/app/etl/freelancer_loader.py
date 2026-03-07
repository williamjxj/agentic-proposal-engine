"""
Freelancer ETL Loader

Loads jobs from scraped Freelancer JSON files, applies domain filter,
normalizes to JobRecord, and supports run_freelancer_ingestion for ETL pipeline.
Aligns with hf_loader and domain_filter patterns.
"""

import hashlib
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.etl.domain_filter import passes_domain_filter
from app.models.job import JobRecord

logger = logging.getLogger(__name__)

PLATFORM = "freelancer"


def _fingerprint(platform: str, external_id: str) -> str:
    """SHA256(platform + external_id) for deduplication."""
    return hashlib.sha256(f"{platform}:{external_id}".encode()).hexdigest()


def _normalize_category(category: str) -> str:
    """Map domain filter category to job_category enum."""
    valid = {
        "ai_ml",
        "web_development",
        "fullstack_engineering",
        "devops_mlops",
        "cloud_infrastructure",
        "software_outsourcing",
        "ui_design",
    }
    return category if category in valid else "other"


def load_and_filter_freelancer_jobs(
    jobs: List[Dict[str, Any]],
    etl_source: str = "freelancer_loader",
) -> tuple[List[JobRecord], int, int]:
    """
    Load jobs from scraped data (list of dicts), apply domain filter, return JobRecords.

    Args:
        jobs: List of job dicts (from freelancer_scraper or JSON file)
        etl_source: Source identifier for etl_runs

    Returns:
        (filtered_job_records, total_extracted, total_filtered)
    """
    total_extracted = len(jobs)
    records: List[JobRecord] = []
    for job in jobs:
        text = f"{job.get('title', '')} {job.get('description', '')}"
        passes, category = passes_domain_filter(text)
        if not passes:
            continue
        external_id = job.get("external_id") or job.get("id", "")
        if not external_id:
            continue
        fp = _fingerprint(PLATFORM, str(external_id))
        skills = job.get("skills") or []
        if isinstance(skills, str):
            skills = [s.strip() for s in skills.split(",") if s.strip()]
        records.append(
            JobRecord(
                platform=PLATFORM,
                external_id=str(external_id),
                fingerprint_hash=fp,
                title=job.get("title", "Unknown"),
                description=(job.get("description") or "")[:10000],
                category=_normalize_category(category),
                skills_required=skills,
                budget_min=job.get("budget_min"),
                budget_max=job.get("budget_max"),
                employer_name=job.get("company"),
                external_url=job.get("url"),
                etl_source=etl_source,
                posted_at=job.get("posted_at"),
                raw_payload={k: v for k, v in job.items() if k not in ("title", "description")},
            )
        )
    total_filtered = len(records)
    logger.info(
        "Freelancer loader: extracted=%d, filtered=%d (source=%s)",
        total_extracted,
        total_filtered,
        etl_source,
    )
    return records, total_extracted, total_filtered


def load_jobs_from_json_file(path: str | Path) -> List[Dict[str, Any]]:
    """
    Load jobs from a Freelancer JSON file (from freelancer_scraper output).

    Expected format: {"metadata": {...}, "jobs": [...]} or {"jobs": [...]}
    """
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, list):
        return data
    return data.get("jobs", [])


async def run_freelancer_ingestion(
    jobs: Optional[List[Dict[str, Any]]] = None,
    json_path: Optional[str] = None,
    etl_source: str = "freelancer_loader",
) -> dict:
    """
    Run full Freelancer ingestion: load, filter, upsert, record etl_runs.

    Args:
        jobs: Pre-fetched job dicts (from scraper). If None, json_path must be set.
        json_path: Path to JSON file from freelancer_scraper. Used when jobs is None.
        etl_source: Source identifier for etl_runs

    Returns:
        Dict with jobs_inserted, jobs_updated, etl_run_id, status
    """
    from datetime import datetime, timezone

    from app.services.job_service import record_etl_run, upsert_jobs

    if jobs is None and json_path:
        jobs = load_jobs_from_json_file(json_path)
    if not jobs:
        logger.warning("No jobs to ingest")
        return {
            "etl_run_id": 0,
            "status": "success",
            "jobs_extracted": 0,
            "jobs_filtered": 0,
            "jobs_inserted": 0,
            "jobs_updated": 0,
        }

    started = datetime.now(timezone.utc)
    jobs_extracted = 0
    jobs_filtered = 0
    jobs_inserted = 0
    jobs_updated = 0
    error_message: Optional[str] = None
    status = "running"

    try:
        records, jobs_extracted, jobs_filtered = load_and_filter_freelancer_jobs(
            jobs=jobs,
            etl_source=etl_source,
        )
        if records:
            inserted, updated = await upsert_jobs(records, etl_source=etl_source)
            jobs_inserted = inserted
            jobs_updated = updated
        status = "success"
    except Exception as e:
        logger.exception("Freelancer ingestion failed")
        error_message = str(e)
        status = "failed"

    completed = datetime.now(timezone.utc)
    etl_run_id = await record_etl_run(
        source=etl_source,
        started_at=started,
        completed_at=completed,
        status=status,
        jobs_extracted=jobs_extracted,
        jobs_filtered=jobs_filtered,
        jobs_inserted=jobs_inserted,
        jobs_updated=jobs_updated,
        error_message=error_message,
    )
    return {
        "etl_run_id": etl_run_id,
        "status": status,
        "jobs_extracted": jobs_extracted,
        "jobs_filtered": jobs_filtered,
        "jobs_inserted": jobs_inserted,
        "jobs_updated": jobs_updated,
    }
