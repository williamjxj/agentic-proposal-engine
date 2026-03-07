"""
Project (Job) Models

Models for representing freelance jobs/projects discovered from
various sources (web scraping, HuggingFace datasets, etc.)
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class ProjectBase(BaseModel):
    """Base project model with common fields."""
    
    title: str = Field(..., description="Project/job title")
    description: str = Field(..., description="Full project description")
    company: Optional[str] = Field(None, description="Company or client name")
    requirements: Optional[str] = Field(None, description="Job requirements")
    skills: List[str] = Field(default_factory=list, description="Required skills/technologies")
    budget_min: Optional[float] = Field(None, description="Minimum budget")
    budget_max: Optional[float] = Field(None, description="Maximum budget")
    budget_type: str = Field("fixed", description="Budget type: fixed or hourly")
    platform: str = Field("upwork", description="Source platform: upwork, freelancer, hf_dataset, etc.")
    url: Optional[str] = Field(None, description="External URL to job posting")
    status: str = Field("new", description="Status: new, reviewed, applied, rejected")


class ProjectCreate(ProjectBase):
    """Model for creating a new project."""
    
    external_id: Optional[str] = Field(None, description="External ID from source platform")
    source: Optional[str] = Field(None, description="Data source identifier")
    posted_at: Optional[str] = Field(None, description="When job was posted")
    client_rating: Optional[float] = Field(None, description="Client rating (1-5)")


class Project(ProjectBase):
    """Full project model with all fields."""
    
    id: str = Field(..., description="Project UUID")
    user_id: str = Field(..., description="User UUID who discovered this project")
    external_id: Optional[str] = Field(None, description="External ID from source platform")
    source: Optional[str] = Field(None, description="Data source identifier")
    posted_at: Optional[datetime] = Field(None, description="When job was posted")
    client_rating: Optional[float] = Field(None, description="Client rating (1-5)")
    created_at: datetime = Field(..., description="When record was created")
    updated_at: datetime = Field(..., description="When record was last updated")
    
    class Config:
        from_attributes = True


class ProjectFilters(BaseModel):
    """Filters for querying projects."""
    
    platform: Optional[str] = Field(None, description="Filter by platform")
    status: Optional[str] = Field(None, description="Filter by status")
    skills: Optional[List[str]] = Field(None, description="Filter by required skills")
    budget_min: Optional[float] = Field(None, description="Minimum budget filter")
    budget_max: Optional[float] = Field(None, description="Maximum budget filter")
    search: Optional[str] = Field(None, description="Search in title/description (comma-separated keywords)")
    category: Optional[str] = Field(None, description="Filter by project category")
    start_date: Optional[datetime] = Field(None, description="Filter by start date")
    end_date: Optional[datetime] = Field(None, description="Filter by end date")
    applied: Optional[bool] = Field(None, description="Filter by applied status")
    sort_by: Optional[str] = Field("date", description="Sort by: date, category")


class ProjectListResponse(BaseModel):
    """Paginated response for project listing."""
    
    jobs: List[dict] = Field(..., description="List of projects")
    total: int = Field(..., description="Total number of projects available")
    page: int = Field(..., description="Current page number")
    pages: int = Field(..., description="Total number of pages")
    limit: int = Field(..., description="Number of results per page")
    source: str = Field(..., description="Data source used")
    dataset_id: Optional[str] = Field(None, description="HuggingFace dataset ID if applicable")


class ProjectDiscoverRequest(BaseModel):
    """Request model for discovering new projects."""
    
    keywords: List[str] = Field(default_factory=list, description="Keywords to search for")
    platforms: List[str] = Field(default_factory=list, description="Platforms to search (upwork, freelancer, etc.)")
    max_results: int = Field(20, ge=1, le=100, description="Maximum results to return")
    dataset_id: Optional[str] = Field(None, description="HuggingFace dataset ID (default from env)")


class ProjectDiscoverResponse(BaseModel):
    """Response model for project discovery."""
    
    success: bool = Field(..., description="Whether the operation was successful")
    source: str = Field(..., description="Data source used (huggingface, scraper, etc.)")
    dataset_id: Optional[str] = Field(None, description="HuggingFace dataset ID if applicable")
    dataset_used: Optional[str] = Field(None, description="Alias for dataset_id")
    count: int = Field(..., description="Number of projects found")
    total: Optional[int] = Field(None, description="Alias for count")
    jobs: List[dict] = Field(..., description="List of discovered jobs")
    keywords_searched: Optional[List[str]] = Field(None, description="Keywords used for search")


class ProjectStats(BaseModel):
    """Statistics about discovered projects."""

    total_jobs: int = Field(..., description="Total number of jobs discovered")
    by_platform: dict = Field(default_factory=dict, description="Job count by platform")
    by_skill: dict = Field(default_factory=dict, description="Job count by skill")
    avg_budget: Optional[float] = Field(None, description="Average budget")
    # Redesigned stats (AI/freelance trends 2025)
    top_in_demand_skill: Optional[str] = Field(
        None, description="Most relevant in-demand skill (prioritizes AI, Python, modern dev)"
    )
    data_source: Optional[str] = Field(
        None, description="Primary data source (e.g. HuggingFace)"
    )
