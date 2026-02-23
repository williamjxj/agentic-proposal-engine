"""
Draft Router

FastAPI router for draft management endpoints.
Implements API contract from contracts/draft-api.yaml
"""

from typing import Optional
import logging
from fastapi import APIRouter, HTTPException, Depends, status

from app.models.draft import (
    Draft,
    DraftSaveRequest,
    DraftResponse,
    DraftListResponse,
    DraftConflictResponse,
    DraftCleanupResult,
)
from app.models.auth import UserResponse
from app.services.draft_manager import draft_manager
from app.core.errors import AutoBidderError, ConflictError
from app.routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/drafts",
    response_model=DraftListResponse,
    status_code=status.HTTP_200_OK,
    summary="List all drafts",
    description="Get all active drafts for the authenticated user",
)
async def list_drafts(
    current_user: UserResponse = Depends(get_current_user),
) -> DraftListResponse:
    """List all user's drafts."""
    try:
        user_id = current_user.id
        
        drafts = await draft_manager.list_drafts(user_id)
        
        return DraftListResponse(
            drafts=drafts,
            count=len(drafts),
        )
    except HTTPException:
        raise
    except AutoBidderError as e:
        logger.error(f"Error listing drafts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": str(e),
                "message": "Failed to retrieve drafts",
                "action": "Please refresh the page. If the problem persists, contact support.",
            },
        )


@router.get(
    "/drafts/{entity_type}/{entity_id}",
    response_model=Draft,
    status_code=status.HTTP_200_OK,
    summary="Get specific draft",
    description="Retrieve a specific draft by entity type and ID",
)
async def get_draft(
    entity_type: str,
    entity_id: str,
    current_user: UserResponse = Depends(get_current_user),
) -> Draft:
    """Get specific draft."""
    try:
        user_id = current_user.id
        
        # Handle "new" as null entity_id
        parsed_entity_id = None if entity_id == "new" else entity_id
        
        draft = await draft_manager.get_draft(user_id, entity_type, parsed_entity_id)
        
        if not draft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Draft not found for {entity_type}:{entity_id}",
            )
        
        return draft
    except HTTPException:
        raise
    except AutoBidderError as e:
        logger.error(f"Error getting draft: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )


@router.put(
    "/drafts/{entity_type}/{entity_id}",
    response_model=Draft,
    status_code=status.HTTP_200_OK,
    summary="Save draft",
    description="Create or update a draft with conflict detection",
)
async def save_draft(
    entity_type: str,
    entity_id: str,
    draft_request: DraftSaveRequest,
    current_user: UserResponse = Depends(get_current_user),
) -> Draft:
    """
    Save draft with conflict detection.
    
    Returns 409 Conflict if version mismatch detected.
    """
    try:
        user_id = current_user.id
        
        # Handle "new" as null entity_id
        parsed_entity_id = None if entity_id == "new" else entity_id
        
        # Validate entity_type
        valid_types = ["proposal", "project", "strategy", "keyword"]
        if entity_type not in valid_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid entity_type. Must be one of: {', '.join(valid_types)}",
            )
        
        # Save draft with conflict detection
        draft = await draft_manager.save_draft(
            user_id,
            entity_type,
            parsed_entity_id,
            draft_request,
        )
        
        return draft
    except HTTPException:
        raise
    except ConflictError as e:
        # Return 409 Conflict response
        logger.warning(f"Draft conflict detected: {e.details}")
        
        # Get current server draft for conflict response
        try:
            server_draft = await draft_manager.get_draft(
                user_id,
                entity_type,
                None if entity_id == "new" else entity_id,
            )
        except Exception:
            server_draft = None
        
        conflict_response = DraftConflictResponse(
            error="Version conflict detected",
            conflict={
                "server_version": e.details.get("server_version", 0),
                "client_version": e.details.get("client_version", 0),
                "server_updated_at": e.details.get("server_updated_at"),
                "conflict_type": "version_mismatch",
            },
            server_draft=server_draft,
        )
        
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=conflict_response.model_dump(),
        )
    except AutoBidderError as e:
        logger.error(f"Error saving draft: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": str(e),
                "message": "Failed to save draft",
                "action": "Please check your input. Ensure the draft size doesn't exceed 1MB and all required fields are valid.",
            },
        )


@router.delete(
    "/drafts/{entity_type}/{entity_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete draft",
    description="Delete a specific draft",
)
async def delete_draft(
    entity_type: str,
    entity_id: str,
    current_user: UserResponse = Depends(get_current_user),
) -> None:
    """Delete draft."""
    try:
        user_id = current_user.id
        
        # Handle "new" as null entity_id
        parsed_entity_id = None if entity_id == "new" else entity_id
        
        await draft_manager.delete_draft(user_id, entity_type, parsed_entity_id)
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting draft: {e}")
        # Return success even if deletion fails (idempotent)
        return None


@router.post(
    "/drafts/cleanup",
    response_model=DraftCleanupResult,
    status_code=status.HTTP_200_OK,
    summary="Cleanup expired drafts",
    description="Delete drafts older than retention period (admin endpoint)",
)
async def cleanup_expired_drafts(
    retention_hours: int = 24,
) -> DraftCleanupResult:
    """
    Clean up expired drafts.
    
    This endpoint should be called by a scheduled job/cron.
    """
    try:
        deleted_count = await draft_manager.cleanup_expired(retention_hours)
        
        return DraftCleanupResult(
            deleted_count=deleted_count,
            retention_hours=retention_hours,
            message=f"Cleanup completed: {deleted_count} drafts deleted",
        )
    except Exception as e:
        logger.error(f"Error cleaning up drafts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cleanup failed",
        )
