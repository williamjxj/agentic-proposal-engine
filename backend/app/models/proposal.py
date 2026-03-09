"""
Proposal Models

Pydantic models for proposal management.
Matches database schema from proposals table.
"""

from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class ProposalBase(BaseModel):
    """Base proposal model with common fields."""

    title: str = Field(..., min_length=1, max_length=500, description="Proposal title")
    description: str = Field(..., min_length=1, description="Proposal description/content")
    budget: Optional[str] = Field(None, description="Proposed budget (string to allow ranges/context)")
    timeline: Optional[str] = Field(None, max_length=200, description="Timeline estimate")
    skills: List[str] = Field(default_factory=list, description="Required skills")

    # Job details
    job_id: Optional[str] = Field(None, description="UUID of persisted job when created from Projects page (FR-010)")
    job_url: Optional[str] = Field(None, description="Original job posting URL")
    job_platform: Optional[str] = Field(None, max_length=100, description="Platform (Upwork, Freelancer)")
    client_name: Optional[str] = Field(None, max_length=255, description="Client name")
    recipient_email: Optional[str] = Field(None, max_length=255, description="Email address to send proposal to")

    # AI metadata
    strategy_id: Optional[str] = Field(None, description="Bidding strategy UUID used")
    generated_with_ai: bool = Field(default=False, description="Whether AI was used to generate")
    ai_model_used: Optional[str] = Field(None, max_length=100, description="AI model name")


class ProposalCreate(ProposalBase):
    """Model for creating a new proposal."""

    status: str = Field(default='draft', description="Initial status")


class ProposalUpdate(BaseModel):
    """Model for updating a proposal (partial updates allowed)."""

    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = Field(None, min_length=1)
    budget: Optional[str] = None
    timeline: Optional[str] = Field(None, max_length=200)
    skills: Optional[List[str]] = None
    job_id: Optional[str] = None
    job_url: Optional[str] = None
    job_platform: Optional[str] = None
    client_name: Optional[str] = None
    recipient_email: Optional[str] = Field(None, max_length=255)
    strategy_id: Optional[str] = None
    status: Optional[str] = Field(None, description="Update status")


class Proposal(ProposalBase):
    """
    Complete proposal model with database fields.

    Matches proposals table schema.
    """

    id: str = Field(..., description="UUID primary key")
    user_id: str = Field(..., description="User UUID")
    job_id: Optional[str] = Field(None, description="Linked job UUID when created from Projects page")

    # Status fields
    status: str = Field(..., description="Proposal status")
    submitted_at: Optional[datetime] = Field(None, description="When submitted to client")
    response_at: Optional[datetime] = Field(None, description="When client responded")

    # Analytics
    view_count: int = Field(default=0, description="Number of views")
    revision_count: int = Field(default=0, description="Number of revisions")

    # Timestamps
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    # Auto-generation (004-improve-autonomous, FR-008)
    source: Optional[str] = Field(None, description="manual or auto_generated")
    auto_generated_at: Optional[datetime] = Field(None, description="When auto-generated")

    # Quality feedback (004-improve-autonomous, FR-009)
    quality_score: Optional[int] = Field(None, description="0-100 overall quality")
    quality_breakdown: Optional[dict] = Field(None, description="Dimension scores")
    quality_suggestions: Optional[List[str]] = Field(None, description="Improvement suggestions")

    class Config:
        """Pydantic config."""
        from_attributes = True


class ProposalListResponse(BaseModel):
    """API response wrapper for proposal list."""

    proposals: List[Proposal]
    total: int
    page: int = 1
    page_size: int = 50


class ProposalQuality(BaseModel):
    """Quality score and suggestions for a proposal (T033, FR-009)."""

    overall_score: Optional[int] = Field(None, description="0-100 overall quality")
    dimension_scores: Optional[dict] = Field(None, description="Scores per dimension")
    suggestions: Optional[List[str]] = Field(None, description="Improvement suggestions")
    word_count: Optional[int] = Field(None, description="Proposal word count")


class ProposalSubmitRequest(BaseModel):
    """Request model for submitting a proposal from draft."""

    # Optional overrides
    title: Optional[str] = None
    description: Optional[str] = None
    budget: Optional[str] = None
    timeline: Optional[str] = None
    skills: Optional[List[str]] = None

    # Job details to add at submission
    job_url: Optional[str] = None
    job_platform: Optional[str] = None
    client_name: Optional[str] = None

    # Whether to mark as submitted immediately
    mark_as_submitted: bool = Field(default=False, description="Mark as submitted vs keeping as draft")
