"""
Keyword Models

Pydantic models for keyword management.
Matches database schema from keywords table.
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class KeywordBase(BaseModel):
    """Base keyword model with common fields."""
    
    keyword: str = Field(..., min_length=1, max_length=255, description="Keyword text")
    description: Optional[str] = Field(None, description="Optional description")
    match_type: str = Field(
        default='partial',
        description="Match type: exact, partial, or fuzzy"
    )
    is_active: bool = Field(default=True, description="Whether keyword is active")
    
    @field_validator('match_type')
    @classmethod
    def validate_match_type(cls, v: str) -> str:
        """Validate match type is one of allowed values."""
        allowed = {'exact', 'partial', 'fuzzy'}
        if v not in allowed:
            raise ValueError(f"match_type must be one of {allowed}")
        return v


class KeywordCreate(KeywordBase):
    """Model for creating a new keyword."""
    pass


class KeywordUpdate(BaseModel):
    """Model for updating an existing keyword."""
    
    keyword: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    match_type: Optional[str] = None
    is_active: Optional[bool] = None
    
    @field_validator('match_type')
    @classmethod
    def validate_match_type(cls, v: Optional[str]) -> Optional[str]:
        """Validate match type if provided."""
        if v is not None:
            allowed = {'exact', 'partial', 'fuzzy'}
            if v not in allowed:
                raise ValueError(f"match_type must be one of {allowed}")
        return v


class Keyword(KeywordBase):
    """Complete keyword model with all fields."""
    
    id: str = Field(..., description="Keyword UUID")
    user_id: str = Field(..., description="User UUID")
    jobs_matched: int = Field(default=0, description="Number of jobs matched")
    last_match_at: Optional[datetime] = Field(None, description="Last match timestamp")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class KeywordStats(BaseModel):
    """Keyword statistics model."""
    
    keyword_id: str = Field(..., description="Keyword UUID")
    jobs_matched: int = Field(..., description="Number of jobs matched")
    last_match_at: Optional[datetime] = Field(None, description="Last match timestamp")
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
