"""
HuggingFace Dataset Job Source Service

Temporary replacement for Crawlee scraping.
Loads job postings from HuggingFace datasets and normalizes
them to match the platform's Job schema.

This is a drop-in replacement for web scraping that allows
development and testing without rate limits or legal concerns.
"""

from datasets import load_dataset
from typing import List, Optional, Dict, Any
import hashlib
import logging
from datetime import datetime, timedelta
import random

logger = logging.getLogger(__name__)


def normalize_hf_job(record: dict, source_dataset: str) -> dict:
    """
    Map a raw HF dataset row → internal Job dict.
    
    Handles multiple dataset formats and normalizes to standard schema.
    
    Args:
        record: Raw dataset record
        source_dataset: HuggingFace dataset ID for format-specific handling
    
    Returns:
        Normalized job dictionary matching internal schema
    """
    
    # jacob-hugging-face/job-descriptions format
    if source_dataset == "jacob-hugging-face/job-descriptions":
        return {
            "external_id": hashlib.md5(
                record.get("job_description", "")[:80].encode()
            ).hexdigest(),
            "platform": "hf_dataset",
            "title": record.get("job_title", "Unknown Title"),
            "company": record.get("company_name", "Unknown Company"),
            "description": record.get("job_description", ""),
            "requirements": record.get("job_requirements", ""),
            "skills": _extract_skills_from_text(record.get("job_requirements", "")),
            "budget_min": None,
            "budget_max": None,
            "budget_type": "fixed",
            "url": "",
            "posted_at": _generate_recent_date(),
            "source": source_dataset,
            "status": "new",
            "client_rating": round(random.uniform(4.0, 5.0), 1)
        }
    
    # lukebarousse/data_jobs format
    elif source_dataset == "lukebarousse/data_jobs":
        skills = record.get("job_skills", [])
        if isinstance(skills, str):
            skills = [s.strip() for s in skills.split(",") if s.strip()]
        
        return {
            "external_id": str(record.get("job_id", hashlib.md5(
                record.get("job_title", "")[:80].encode()
            ).hexdigest())),
            "platform": "hf_dataset",
            "title": record.get("job_title_short", record.get("job_title", "")),
            "company": record.get("company_name", ""),
            "description": record.get("job_description", ""),
            "requirements": "",
            "skills": skills if isinstance(skills, list) else [],
            "budget_min": record.get("salary_year_avg"),
            "budget_max": record.get("salary_year_max"),
            "budget_type": "fixed",
            "url": record.get("job_posting_url", ""),
            "posted_at": record.get("job_posted_date", _generate_recent_date()),
            "source": source_dataset,
            "status": "new",
            "client_rating": round(random.uniform(4.0, 5.0), 1)
        }
    
    # debasmitamukherjee/IT_job_postings format
    elif "IT_job_postings" in source_dataset or "it_job" in source_dataset.lower():
        return {
            "external_id": hashlib.md5(
                str(record.get("Job Title", ""))[:80].encode()
            ).hexdigest(),
            "platform": "hf_dataset",
            "title": record.get("Job Title", record.get("title", "Unknown Title")),
            "company": record.get("Company", record.get("company", "Tech Company")),
            "description": record.get("Job Description", record.get("description", "")),
            "requirements": record.get("Requirements", record.get("requirements", "")),
            "skills": _extract_skills_from_text(
                record.get("Skills", record.get("skills", ""))
            ),
            "budget_min": record.get("Salary", record.get("salary")),
            "budget_max": None,
            "budget_type": "fixed",
            "url": "",
            "posted_at": _generate_recent_date(),
            "source": source_dataset,
            "status": "new",
            "client_rating": round(random.uniform(4.0, 5.0), 1)
        }
    
    # Generic fallback: pass through with sensible defaults
    return {
        "external_id": hashlib.md5(
            str(record.get("title", record.get("job_title", "")))[:80].encode()
        ).hexdigest(),
        "platform": "hf_dataset",
        "title": record.get("title", record.get("job_title", "Unknown Title")),
        "company": record.get("company", record.get("company_name", "Company")),
        "description": record.get("description", record.get("job_description", "")),
        "requirements": record.get("requirements", record.get("job_requirements", "")),
        "skills": _extract_skills_from_text(
            record.get("skills", record.get("job_skills", ""))
        ),
        "budget_min": None,
        "budget_max": None,
        "budget_type": "fixed",
        "url": record.get("url", ""),
        "posted_at": _generate_recent_date(),
        "source": source_dataset,
        "status": "new",
        "client_rating": round(random.uniform(4.0, 5.0), 1)
    }


def _extract_skills_from_text(text: str) -> List[str]:
    """
    Extract skills from text field.
    
    Handles comma-separated, pipe-separated, and other formats.
    """
    if not text or not isinstance(text, str):
        return []
    
    # Try common separators
    for sep in [",", "|", ";", "/"]:
        if sep in text:
            skills = [s.strip() for s in text.split(sep)]
            return [s for s in skills if s and len(s) < 50]  # Filter out long strings
    
    # If no separator, return as single skill if reasonable length
    if len(text) < 50:
        return [text.strip()]
    
    return []


def _generate_recent_date() -> str:
    """Generate a recent posted date (last 30 days)."""
    days_ago = random.randint(0, 30)
    posted_date = datetime.now() - timedelta(days=days_ago)
    return posted_date.isoformat()


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
        List of normalized job dictionaries
    
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
            return []
    
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
        
        # Optional keyword filter
        if keyword_filter:
            text = f"{normalized.get('title', '')} {normalized.get('description', '')}".lower()
            if not any(kw.lower() in text for kw in keyword_filter):
                continue
        
        jobs.append(normalized)
    
    logger.info(f"Returned {len(jobs)} jobs from HF dataset (processed {processed} records)")
    return jobs


def get_available_datasets() -> List[Dict[str, Any]]:
    """
    Get list of recommended HuggingFace datasets for job data.
    
    Returns:
        List of dataset info dictionaries
    """
    return [
        {
            "id": "jacob-hugging-face/job-descriptions",
            "name": "Job Descriptions",
            "description": "Clean title, company, description, requirements",
            "recommended": True,
            "size": "~5K+ jobs",
            "best_for": "General freelance-style postings"
        },
        {
            "id": "lukebarousse/data_jobs",
            "name": "Data Jobs (2023)",
            "description": "30K+ real job postings from Google with skills, salary",
            "recommended": True,
            "size": "30K+ jobs",
            "best_for": "Large variety, salary data, skills arrays"
        },
        {
            "id": "debasmitamukherjee/IT_job_postings",
            "name": "IT Job Postings",
            "description": "Tech-focused postings with skills, salary",
            "recommended": False,
            "size": "~10K+ jobs",
            "best_for": "Tech-specific jobs"
        }
    ]


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
    return fetch_hf_jobs(
        dataset_id=dataset_id,
        limit=limit,
        keyword_filter=keywords
    )


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
    return fetch_hf_jobs(
        dataset_id=dataset_id,
        limit=max_results,
        keyword_filter=search_terms if search_terms else None
    )
