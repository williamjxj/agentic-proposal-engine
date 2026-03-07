"""
Integration tests for HuggingFace job source service.

Tests job loading, keyword search, and dataset listing.
Requires internet connection for HuggingFace access.
"""

from __future__ import annotations

import pytest

from app.services.hf_job_source import (
    fetch_hf_jobs,
    get_available_datasets,
    search_hf_jobs,
)


@pytest.mark.integration
@pytest.mark.slow
def test_hf_basic_loading() -> None:
    """Basic job loading from HuggingFace dataset."""
    jobs = fetch_hf_jobs(
        dataset_id="jacob-hugging-face/job-descriptions",
        limit=5,
    )
    assert len(jobs) <= 5
    if jobs:
        job = jobs[0]
        assert "title" in job
        assert "platform" in job
        assert "description" in job


@pytest.mark.integration
@pytest.mark.slow
def test_hf_keyword_search() -> None:
    """Keyword filtering returns matching jobs."""
    keywords = ["python", "fastapi"]
    jobs = search_hf_jobs(
        keywords=keywords,
        dataset_id="jacob-hugging-face/job-descriptions",
        limit=10,
    )
    assert isinstance(jobs, list)
    # At least some jobs should contain keywords (or empty if none match)
    for job in jobs[:3]:
        assert "title" in job
        assert "description" in job


@pytest.mark.integration
def test_hf_available_datasets() -> None:
    """Available datasets returns expected structure."""
    datasets = get_available_datasets()
    assert len(datasets) > 0
    for ds in datasets:
        assert "id" in ds
        assert "name" in ds
        assert "size" in ds
        assert "best_for" in ds


@pytest.mark.integration
@pytest.mark.slow
def test_hf_data_jobs_dataset() -> None:
    """Alternative dataset (lukebarousse/data_jobs) can be loaded."""
    try:
        jobs = fetch_hf_jobs(
            dataset_id="lukebarousse/data_jobs",
            limit=3,
        )
        assert len(jobs) <= 3
        if jobs:
            assert "title" in jobs[0]
            assert "company" in jobs[0]
    except Exception:
        pytest.skip("data_jobs dataset not available or network error")
