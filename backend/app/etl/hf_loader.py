"""
HuggingFace ETL Loader

Loads jobs from HuggingFace datasets, applies domain filter,
normalizes to JobRecord, and supports run_hf_ingestion for ETL pipeline.
Per docs/todos/autobidder-etl-rag-schema-spec.md Section 2.2
"""

import hashlib
import logging
from typing import List, Optional

from app.etl.domain_filter import passes_domain_filter
from app.models.job import JobRecord
from app.services.hf_job_source import fetch_hf_jobs

logger = logging.getLogger(__name__)

# Platform value for jobs table enum
HF_PLATFORM = "huggingface_dataset"


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


def load_and_filter_hf_jobs(
    dataset_id: str = "jacob-hugging-face/job-descriptions",
    limit: int = 200,
    keyword_filter: Optional[List[str]] = None,
) -> tuple[List[JobRecord], int, int]:
    """
    Load jobs from HuggingFace, apply domain filter, return JobRecords.

    Args:
        dataset_id: HuggingFace dataset ID
        limit: Max jobs to fetch
        keyword_filter: Optional keywords for filtering

    Returns:
        (filtered_job_records, total_extracted, total_filtered)
    """
    raw_jobs = fetch_hf_jobs(
        dataset_id=dataset_id,
        limit=limit,
        keyword_filter=keyword_filter,
    )
    total_extracted = len(raw_jobs)
    records: List[JobRecord] = []
    for job in raw_jobs:
        text = f"{job.get('title', '')} {job.get('description', '')}"
        passes, category = passes_domain_filter(text)
        if not passes:
            continue
        external_id = job.get("external_id") or job.get("id", "")
        platform = HF_PLATFORM
        fp = _fingerprint(platform, external_id)
        skills = job.get("skills") or []
        if isinstance(skills, str):
            skills = [s.strip() for s in skills.split(",") if s.strip()]
        records.append(
            JobRecord(
                platform=platform,
                external_id=str(external_id),
                fingerprint_hash=fp,
                title=job.get("title", "Unknown"),
                description=job.get("description", "")[:10000],
                category=_normalize_category(category),
                skills_required=skills,
                budget_min=job.get("budget_min"),
                budget_max=job.get("budget_max"),
                employer_name=job.get("company"),
                external_url=job.get("url"),
                etl_source=dataset_id,
                posted_at=job.get("posted_at"),
                raw_payload={k: v for k, v in job.items() if k not in ("title", "description")},
            )
        )
    total_filtered = len(records)
    logger.info(
        f"HF loader: extracted={total_extracted}, filtered={total_filtered} "
        f"(dataset={dataset_id})"
    )
    return records, total_extracted, total_filtered


async def run_hf_ingestion(
    dataset_id: str = "jacob-hugging-face/job-descriptions",
    limit: int = 200,
) -> dict:
    """
    Run full HF ingestion: load, filter, upsert, record etl_runs.

    Args:
        dataset_id: HuggingFace dataset ID
        limit: Max jobs to process

    Returns:
        Dict with jobs_inserted, jobs_updated, etl_run_id, status
    """
    from datetime import datetime, timezone

    from app.services.job_service import record_etl_run, upsert_jobs

    started = datetime.now(timezone.utc)
    jobs_extracted = 0
    jobs_filtered = 0
    jobs_inserted = 0
    jobs_updated = 0
    error_message: Optional[str] = None
    status = "running"

    try:
        records, jobs_extracted, jobs_filtered = load_and_filter_hf_jobs(
            dataset_id=dataset_id,
            limit=limit,
        )
        if records:
            inserted, updated = await upsert_jobs(records)
            jobs_inserted = inserted
            jobs_updated = updated
        status = "success"
    except Exception as e:
        logger.exception("HF ingestion failed")
        error_message = str(e)
        status = "failed"

    completed = datetime.now(timezone.utc)
    etl_run_id = await record_etl_run(
        source="hf_loader",
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
