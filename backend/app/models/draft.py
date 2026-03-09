"""
Draft Work Models

Pydantic models for draft work management.
Matches database schema from draft_work table.
"""

from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
import json


class DraftBase(BaseModel):
    """Base draft model with common fields."""

    entity_type: str = Field(..., min_length=1, max_length=50, description="Type of entity (proposal, project, etc.)")
    entity_id: Optional[str] = Field(None, max_length=100, description="Entity ID (null for new entities)")
    draft_data: Dict[str, Any] = Field(..., description="Draft content as JSON")
    version: int = Field(default=1, ge=1, description="Version number for conflict detection")

    @field_validator('draft_data', mode='before')
    @classmethod
    def validate_draft_data(cls, v: Any) -> Dict[str, Any]:
        """
        Validate and convert draft data.

        Handles both dict objects and JSON strings from database.
        """
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                raise ValueError("draft_data must be valid JSON")

        if isinstance(v, dict):
            return v

        raise ValueError("draft_data must be a dictionary or JSON string")


class DraftCreate(DraftBase):
    """Model for creating new draft (user_id will be added from auth)."""

    pass


class DraftUpdate(BaseModel):
    """Model for updating draft (partial updates allowed)."""

    draft_data: Optional[Dict[str, Any]] = None
    version: Optional[int] = None

    @field_validator('draft_data', mode='before')
    @classmethod
    def validate_draft_data(cls, v: Any) -> Optional[Dict[str, Any]]:
        """Validate draft data if provided."""
        if v is None:
            return None

        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                raise ValueError("draft_data must be valid JSON")

        if isinstance(v, dict):
            return v

        raise ValueError("draft_data must be a dictionary or JSON string")


class Draft(DraftBase):
    """
    Complete draft model with database fields.

    Matches draft_work table schema.
    """

    id: str = Field(..., description="UUID primary key")
    user_id: str = Field(..., description="User UUID from auth.users")
    created_at: datetime = Field(..., description="Draft creation time")
    updated_at: datetime = Field(..., description="Last update time")
    last_saved_at: datetime = Field(..., description="Last auto-save timestamp")

    class Config:
        """Pydantic config."""
        from_attributes = True


class DraftResponse(BaseModel):
    """API response wrapper for single draft."""

    draft: Draft


class DraftListResponse(BaseModel):
    """API response wrapper for draft list."""

    drafts: list[Draft]
    count: int


class DraftSaveRequest(BaseModel):
    """Request model for saving a draft."""

    draft_data: Dict[str, Any] = Field(..., description="Draft content")
    version: int = Field(default=1, ge=1, description="Current version for conflict detection")

    @field_validator('draft_data')
    @classmethod
    def validate_draft_size(cls, v: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate draft size doesn't exceed limit.

        Default limit is 1MB as per spec.
        """
        # Convert to JSON string to check size (ensure_ascii=False to handle emojis properly)
        json_str = json.dumps(v, ensure_ascii=False)
        size_bytes = len(json_str.encode('utf-8'))
        max_size_bytes = 1024 * 1024  # 1MB

        if size_bytes > max_size_bytes:
            raise ValueError(
                f"Draft size ({size_bytes} bytes) exceeds maximum allowed size ({max_size_bytes} bytes)"
            )

        return v


class DraftConflict(BaseModel):
    """Model for draft conflict information."""

    server_version: int = Field(..., description="Current version on server")
    client_version: int = Field(..., description="Version client tried to save")
    server_updated_at: datetime = Field(..., description="When server version was last updated")
    conflict_type: str = Field(default="version_mismatch", description="Type of conflict")


class DraftConflictResponse(BaseModel):
    """API response for draft conflicts (409 status)."""

    error: str = Field(default="Version conflict detected")
    conflict: DraftConflict
    server_draft: Optional[Draft] = None


class DraftCleanupResult(BaseModel):
    """Result of draft cleanup operation."""

    deleted_count: int = Field(default=0, description="Number of drafts deleted")
    retention_hours: int = Field(..., description="Retention period used")
    message: str = Field(default="Cleanup completed successfully")
