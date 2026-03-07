"""
Job and ETL Models

Pydantic models for jobs table, etl_runs, and user_job_status.
Per specs/003-projects-etl-persistence/data-model.md
"""

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class JobBase(BaseModel):
    """Base job model."""

    title: str = Field(..., description="Job title")
    description: str = Field(..., description="Full description")
    platform: str = Field(..., description="Source platform")
    external_id: str = Field(..., description="Platform job ID")
    fingerprint_hash: str = Field(..., description="SHA256(platform+external_id)")
    category: str = Field(..., description="Domain category")
    skills_required: List[str] = Field(default_factory=list)
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    budget_currency: str = "USD"
    employer_name: Optional[str] = None
    external_url: Optional[str] = None
    etl_source: Optional[str] = None
    posted_at: Optional[datetime] = None


class Job(JobBase):
    """Full job model with DB fields."""

    id: str = Field(..., description="UUID")
    status: str = Field(default="new")
    scraped_at: Optional[datetime] = None
    created_at: datetime = Field(...)
    updated_at: datetime = Field(...)
    raw_payload: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class JobRecord(BaseModel):
    """Normalized job record for ETL upsert."""

    platform: str = "huggingface_dataset"
    external_id: str
    fingerprint_hash: str
    title: str
    description: str
    category: str = "other"
    skills_required: List[str] = Field(default_factory=list)
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    budget_currency: str = "USD"
    employer_name: Optional[str] = None
    external_url: Optional[str] = None
    etl_source: str = "hf_loader"
    posted_at: Optional[str] = None
    raw_payload: Optional[Dict[str, Any]] = None


class ETLRun(BaseModel):
    """ETL run audit record."""

    id: int
    source: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    status: Optional[str] = None
    jobs_extracted: int = 0
    jobs_filtered: int = 0
    jobs_inserted: int = 0
    jobs_updated: int = 0
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class UserJobStatus(BaseModel):
    """Per-user job status."""

    id: str
    user_id: str
    job_id: str
    status: str = Field(..., description="reviewed, applied, won, lost, archived")
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
