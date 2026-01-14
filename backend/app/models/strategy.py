"""
Strategy Models

Pydantic models for bidding strategy management.
Matches database schema from bidding_strategies table.
"""

from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator


class StrategyBase(BaseModel):
    """Base strategy model with common fields."""
    
    name: str = Field(..., min_length=1, max_length=255, description="Strategy name")
    description: Optional[str] = Field(None, description="Optional description")
    system_prompt: str = Field(..., min_length=1, description="System prompt for AI")
    tone: str = Field(
        default='professional',
        description="Tone: professional, enthusiastic, technical, friendly, or formal"
    )
    focus_areas: List[str] = Field(default_factory=list, description="Focus areas list")
    temperature: Decimal = Field(
        default=Decimal('0.7'),
        ge=Decimal('0.0'),
        le=Decimal('2.0'),
        description="Temperature for AI generation (0-2)"
    )
    max_tokens: int = Field(
        default=1500,
        ge=100,
        le=4000,
        description="Maximum tokens for generation (100-4000)"
    )
    is_default: bool = Field(default=False, description="Whether this is the default strategy")
    
    @field_validator('tone')
    @classmethod
    def validate_tone(cls, v: str) -> str:
        """Validate tone is one of allowed values."""
        allowed = {'professional', 'enthusiastic', 'technical', 'friendly', 'formal'}
        if v not in allowed:
            raise ValueError(f"tone must be one of {allowed}")
        return v


class StrategyCreate(StrategyBase):
    """Model for creating a new strategy."""
    pass


class StrategyUpdate(BaseModel):
    """Model for updating an existing strategy."""
    
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    system_prompt: Optional[str] = Field(None, min_length=1)
    tone: Optional[str] = None
    focus_areas: Optional[List[str]] = None
    temperature: Optional[Decimal] = Field(None, ge=Decimal('0.0'), le=Decimal('2.0'))
    max_tokens: Optional[int] = Field(None, ge=100, le=4000)
    
    @field_validator('tone')
    @classmethod
    def validate_tone(cls, v: Optional[str]) -> Optional[str]:
        """Validate tone if provided."""
        if v is not None:
            allowed = {'professional', 'enthusiastic', 'technical', 'friendly', 'formal'}
            if v not in allowed:
                raise ValueError(f"tone must be one of {allowed}")
        return v


class Strategy(StrategyBase):
    """Complete strategy model with all fields."""
    
    id: str = Field(..., description="Strategy UUID")
    user_id: str = Field(..., description="User UUID")
    use_count: int = Field(default=0, description="Number of times strategy was used")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            Decimal: lambda v: float(v)
        }


class TestStrategyRequest(BaseModel):
    """Request model for testing a strategy."""
    
    job_description: Optional[str] = Field(None, description="Optional sample job description")


class TestProposal(BaseModel):
    """Response model for strategy test."""
    
    proposal: str = Field(..., description="Generated proposal text")
    test_mode: bool = Field(default=True, description="Indicates this is a test proposal")
