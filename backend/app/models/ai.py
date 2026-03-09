"""
AI Models

Pydantic models for AI-powered operations like proposal generation.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class ProposalGenerateRequest(BaseModel):
    """Request model for generating a proposal from a job."""

    job_id: Optional[str] = Field(None, description="Internal project/job UUID")
    job_title: str = Field(..., description="Job title / position title")
    job_description: str = Field(..., description="Full job description")
    job_company: Optional[str] = Field(None, description="Company name (for personalization)")
    job_skills: List[str] = Field(default_factory=list, description="Required skills for the job")
    job_model_response: Optional[str] = Field(
        None,
        description="Structured job analysis from dataset (Core Responsibilities, Required Skills, etc.)",
    )

    strategy_id: Optional[str] = Field(None, description="Bidding strategy UUID to use")

    # Optional: limit RAG to specific collections (default: all)
    collections: Optional[List[str]] = Field(
        None,
        description="Knowledge base collections to use for RAG (case_studies, team_profiles, portfolio, other). Empty/None = all.",
    )

    # Optional context overrides
    extra_context: Optional[str] = Field(None, description="Additional context to provide to the AI")
    custom_instructions: Optional[str] = Field(None, description="Custom instructions for this specific proposal")


class GeneratedProposal(BaseModel):
    """Result of an AI proposal generation."""

    title: str = Field(..., description="Generated proposal title")
    description: str = Field(..., description="Generated proposal content")
    budget: Optional[str] = Field(None, description="Suggested budget range or value")
    timeline: Optional[str] = Field(None, description="Suggested timeline")
    skills: List[str] = Field(default_factory=list, description="Relevant skills identified")

    # Metadata
    ai_model: str = Field(..., description="AI model used for generation")
    strategy_id: Optional[str] = Field(None, description="Strategy UUID used")
    tokens_used: Optional[int] = Field(None, description="Approximate tokens used")
    confidence_score: float = Field(default=1.0, description="AI confidence score (0-1)")

    # Quality (T032 - proposal quality feedback)
    quality_score: Optional[float] = Field(None, description="0-100 overall quality")
    quality_breakdown: Optional[Dict[str, float]] = Field(None, description="Dimension scores")
    quality_suggestions: Optional[List[str]] = Field(None, description="Improvement suggestions")


class RAGContext(BaseModel):
    """Context retrieved from the knowledge base for a job."""

    query: str = Field(..., description="Original query used for search")
    relevant_chunks: List[Dict[str, Any]] = Field(..., description="Relevant text chunks found")
    total_chunks: int = Field(..., description="Total number of chunks retrieved")
