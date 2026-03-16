"""
HuggingFace Dataset Job Source Service

Loads job postings from HuggingFace datasets and normalizes them
to match the platform's Job schema via source adapters (etl/source_adapters.py).
"""

from datasets import load_dataset
from typing import List, Optional, Dict, Any
import logging

from app.etl.source_adapters import normalize_to_canonical

logger = logging.getLogger(__name__)


def normalize_hf_job(record: dict, source_dataset: str) -> dict:
    """
    Map a raw HF dataset row → internal Job dict.
    Delegates to source adapters.
    """
    return normalize_to_canonical(
        dict(record) if not isinstance(record, dict) else record,
        source_dataset,
    )


def fetch_hf_jobs(
    dataset_id: str = "jacob-hugging-face/job-descriptions",
    split: str = "train",
    limit: int = 50,
    keyword_filter: Optional[List[str]] = None,
) -> List[dict]:
    """
    Load jobs from a HuggingFace dataset and return normalized records.

    This function uses streaming mode to avoid downloading the entire dataset,
    making it efficient for large datasets.

    Args:
        dataset_id: HF dataset repo ID (e.g., "jacob-hugging-face/job-descriptions")
        split: Dataset split to use ('train', 'test', etc.)
        limit: Max jobs to return
        keyword_filter: Optional list of keywords to filter titles/descriptions

    Returns:
        Tuple of (jobs list, total_scanned count). total_scanned = records streamed.

    Examples:
        >>> # Load 10 jobs from default dataset
        >>> jobs = fetch_hf_jobs(limit=10)

        >>> # Search for Python jobs
        >>> python_jobs = fetch_hf_jobs(
        ...     dataset_id="jacob-hugging-face/job-descriptions",
        ...     limit=20,
        ...     keyword_filter=["python", "fastapi"]
        ... )
    """
    logger.info(f"Loading HF dataset: {dataset_id} (split={split}, limit={limit})")

    try:
        # Use streaming=True to avoid downloading entire dataset
        ds = load_dataset(dataset_id, split=split, streaming=True)
    except Exception as e:
        logger.error(f"Failed to load HF dataset {dataset_id}: {e}")
        logger.info("Attempting to load without streaming...")
        try:
            ds = load_dataset(dataset_id, split=split)
        except Exception as e2:
            logger.error(f"Failed to load dataset even without streaming: {e2}")
            return [], 0

    jobs = []
    processed = 0

    for record in ds:
        if len(jobs) >= limit:
            break

        processed += 1

        # Convert to dict if needed
        if not isinstance(record, dict):
            record = dict(record)

        # Normalize the job
        try:
            normalized = normalize_hf_job(record, dataset_id)
        except Exception as e:
            logger.warning(f"Failed to normalize record: {e}")
            continue

        # Optional keyword filter (search in title, description, requirements, skills, model_response)
        # model_response (jacob-hugging-face) often contains AI-generated skills/summary not in raw fields
        if keyword_filter:
            skills_str = " ".join(normalized.get("skills") or [])
            model_resp = normalized.get("model_response") or ""
            text = (
                f"{normalized.get('title', '')} {normalized.get('description', '')} "
                f"{normalized.get('requirements', '')} {skills_str} {model_resp}"
            ).lower()
            if not any(kw.lower() in text for kw in keyword_filter):
                continue

        jobs.append(normalized)

    logger.info(
        f"Returned {len(jobs)} jobs from HF dataset (processed {processed} records)"
    )
    return jobs, processed


def fetch_hf_jobs_multi(
    dataset_ids: Optional[List[str]] = None,
    split: str = "train",
    limit_per_dataset: int = 50,
    keyword_filter: Optional[List[str]] = None,
) -> tuple[List[dict], int]:
    """
    Load jobs from multiple HuggingFace datasets, merge and deduplicate.
    Returns (jobs list, total_processed count).
    """
    from app.config import settings

    ids = dataset_ids or settings.hf_dataset_ids_list
    all_jobs: List[dict] = []
    seen_fp: set[str] = set()
    total_processed = 0

    for did in ids:
        jobs, processed = fetch_hf_jobs(
            dataset_id=did,
            split=split,
            limit=limit_per_dataset,
            keyword_filter=keyword_filter,
        )
        total_processed += processed
        for j in jobs:
            fp = j.get("external_id") or j.get("id", "")
            if fp and fp not in seen_fp:
                seen_fp.add(fp)
                all_jobs.append(j)

    return all_jobs, total_processed


def get_available_datasets() -> List[Dict[str, Any]]:
    """
    Get list of available data sources: HF datasets from config + freelancer + manual.
    """
    from app.config import settings

    hf_ids = settings.hf_dataset_ids_list
    static: Dict[str, Dict[str, Any]] = {
        "jacob-hugging-face/job-descriptions": {
            "id": "jacob-hugging-face/job-descriptions",
            "name": "Job Descriptions",
            "description": "Clean title, company, description, requirements",
            "recommended": True,
            "size": "~5K+ jobs",
            "best_for": "General freelance-style postings",
        },
        "lukebarousse/data_jobs": {
            "id": "lukebarousse/data_jobs",
            "name": "Data Jobs (2023)",
            "description": "30K+ real job postings with skills, salary",
            "recommended": True,
            "size": "30K+ jobs",
            "best_for": "Large variety, salary data",
        },
        "datastax/linkedin_job_listings": {
            "id": "datastax/linkedin_job_listings",
            "name": "LinkedIn Job Listings",
            "description": "LinkedIn-style postings with min/max salary",
            "recommended": False,
            "size": "~10K+ jobs",
            "best_for": "Corporate job data",
        },
        "debasmitamukherjee/IT_job_postings": {
            "id": "debasmitamukherjee/IT_job_postings",
            "name": "IT Job Postings",
            "description": "Tech-focused postings with skills, salary",
            "recommended": False,
            "size": "~10K+ jobs",
            "best_for": "Tech-specific jobs",
        },
        "freelancer": {
            "id": "freelancer",
            "name": "Freelancer.com",
            "description": "Scraped jobs from Freelancer.com",
            "recommended": False,
            "size": "Varies",
            "best_for": "Live platform jobs",
        },
        "manual": {
            "id": "manual",
            "name": "Manual / Upload",
            "description": "Manually added or bulk-uploaded jobs",
            "recommended": False,
            "size": "User-defined",
            "best_for": "Custom job sources",
        },
    }
    # Build list: HF datasets from config first, then freelancer, manual
    result: List[Dict[str, Any]] = []
    for did in hf_ids:
        if did in static:
            result.append(static[did])
        else:
            result.append({
                "id": did,
                "name": did.split("/")[-1] if "/" in did else did,
                "description": "HuggingFace dataset",
                "recommended": False,
                "size": "Unknown",
                "best_for": "General",
            })
    for sid in ("freelancer", "manual"):
        if sid not in [r["id"] for r in result]:
            result.append(static[sid])
    return result


def search_hf_jobs(
    keywords: List[str],
    dataset_id: str = "jacob-hugging-face/job-descriptions",
    limit: int = 20
) -> List[dict]:
    """
    Convenience function to search jobs by keywords.

    Args:
        keywords: List of search terms
        dataset_id: HuggingFace dataset ID
        limit: Max results

    Returns:
        List of matching job dictionaries
    """
    jobs, _ = fetch_hf_jobs(
        dataset_id=dataset_id,
        limit=limit,
        keyword_filter=keywords
    )
    return jobs


# Alias for backwards compatibility with scraper interface
async def scrape_jobs_from_hf(
    platform: str,
    search_terms: List[str],
    max_results: int = 20,
    dataset_id: str = "jacob-hugging-face/job-descriptions"
) -> List[dict]:
    """
    Async-compatible function matching scraper interface.

    This allows HuggingFace dataset loading to be a drop-in replacement
    for async web scraping functions.

    Args:
        platform: Platform name (ignored for HF datasets)
        search_terms: Keywords to filter jobs
        max_results: Max jobs to return
        dataset_id: HuggingFace dataset ID

    Returns:
        List of job dictionaries
    """
    jobs, _ = fetch_hf_jobs(
        dataset_id=dataset_id,
        limit=max_results,
        keyword_filter=search_terms if search_terms else None
    )
    return jobs
