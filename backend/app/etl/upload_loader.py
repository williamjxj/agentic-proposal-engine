"""
Manual Upload ETL Loader

Parses JSON/JSONL/CSV job files, normalizes via ManualUploadAdapter,
applies domain filter, and upserts to projects.
"""

import csv
import io
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.etl.domain_filter import passes_domain_filter
from app.etl.source_adapters import ManualUploadAdapter
from app.models.job import JobRecord

logger = logging.getLogger(__name__)

PLATFORM = "manual"
ADAPTER = ManualUploadAdapter()


def _fingerprint(platform: str, external_id: str) -> str:
    """SHA256(platform + external_id) for deduplication."""
    import hashlib
    return hashlib.sha256(f"{platform}:{external_id}".encode()).hexdigest()


def _normalize_category(category: str) -> str:
    """Map domain filter category to job_category enum."""
    valid = {
        "ai_ml", "web_development", "fullstack_engineering",
        "devops_mlops", "cloud_infrastructure",
        "software_outsourcing", "ui_design",
    }
    return category if category in valid else "other"


def _parse_json(content: bytes) -> List[Dict[str, Any]]:
    """Parse JSON array or JSONL (one JSON object per line)."""
    text = content.decode("utf-8", errors="replace").strip()
    if not text:
        return []
    if text.startswith("["):
        return json.loads(text)
    # JSONL
    rows = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return rows


def _parse_csv(content: bytes) -> List[Dict[str, Any]]:
    """Parse CSV with headers into list of dicts."""
    text = content.decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    return list(reader)


def load_and_filter_upload_jobs(
    jobs: List[Dict[str, Any]],
    etl_source: str = "manual_upload",
) -> tuple[List[JobRecord], int, int]:
    """
    Normalize uploaded jobs, apply domain filter, return JobRecords.
    """
    total_extracted = len(jobs)
    records: List[JobRecord] = []
    for job in jobs:
        if not isinstance(job, dict):
            continue
        canonical = ADAPTER.to_canonical(job)
        text = f"{canonical.get('title', '')} {canonical.get('description', '')}"
        passes, category = passes_domain_filter(text)
        if not passes:
            continue
        ext_id = canonical.get("external_id", "")
        fp = _fingerprint(PLATFORM, str(ext_id))
        skills = canonical.get("skills") or []
        if isinstance(skills, str):
            skills = [s.strip() for s in str(skills).split(",") if s.strip()]
        records.append(
            JobRecord(
                platform=PLATFORM,
                external_id=str(ext_id),
                fingerprint_hash=fp,
                title=canonical.get("title", "Unknown"),
                description=(canonical.get("description") or "")[:10000],
                category=_normalize_category(category),
                skills_required=skills,
                budget_min=canonical.get("budget_min"),
                budget_max=canonical.get("budget_max"),
                employer_name=canonical.get("company"),
                external_url=canonical.get("url"),
                etl_source=etl_source,
                posted_at=canonical.get("posted_at"),
                raw_payload={k: v for k, v in job.items()},
            )
        )
    total_filtered = len(records)
    logger.info("Upload loader: extracted=%d, filtered=%d", total_extracted, total_filtered)
    return records, total_extracted, total_filtered


async def run_upload_ingestion(
    content: bytes,
    filename: str,
    etl_source: str = "manual_upload",
) -> dict:
    """
    Parse file content, filter, upsert. Supports .json, .jsonl, .csv.
    """
    from datetime import datetime, timezone

    from app.services.project_service import record_etl_run, upsert_jobs

    ext = Path(filename).suffix.lower()
    if ext == ".csv":
        jobs = _parse_csv(content)
    else:
        jobs = _parse_json(content)

    if not jobs:
        return {
            "etl_run_id": 0,
            "status": "success",
            "jobs_extracted": 0,
            "jobs_filtered": 0,
            "jobs_inserted": 0,
            "jobs_updated": 0,
        }

    started = datetime.now(timezone.utc)
    records, extracted, filtered = load_and_filter_upload_jobs(jobs, etl_source=etl_source)
    inserted, updated = 0, 0
    if records:
        inserted, updated = await upsert_jobs(records, etl_source=etl_source)
    completed = datetime.now(timezone.utc)
    etl_run_id = await record_etl_run(
        source=etl_source,
        started_at=started,
        completed_at=completed,
        status="success",
        jobs_extracted=extracted,
        jobs_filtered=filtered,
        jobs_inserted=inserted,
        jobs_updated=updated,
    )
    return {
        "etl_run_id": etl_run_id,
        "status": "success",
        "jobs_extracted": extracted,
        "jobs_filtered": filtered,
        "jobs_inserted": inserted,
        "jobs_updated": updated,
    }
