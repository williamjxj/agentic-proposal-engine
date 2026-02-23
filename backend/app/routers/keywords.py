"""
Keywords Router

FastAPI router for keyword management endpoints.
Implements API contract from contracts/keywords-api.yaml
"""

from typing import Optional
import logging
from fastapi import APIRouter, HTTPException, Depends, Query, status
from fastapi.responses import JSONResponse

from app.models.keyword import (
    Keyword,
    KeywordCreate,
    KeywordUpdate,
    KeywordStats,
)
from app.models.auth import UserResponse
from app.services.keyword_service import keyword_service
from app.core.errors import AutoBidderError
from app.routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/keywords",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="List user keywords",
    description="Retrieves all keywords for the authenticated user with optional filters",
)
async def list_keywords(
    search: Optional[str] = Query(None, description="Search keywords by text or description"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    match_type: Optional[str] = Query(None, description="Filter by match type"),
    current_user: UserResponse = Depends(get_current_user),
) -> dict:
    """
    List all keywords for the authenticated user.
    
    Args:
        search: Optional search term
        is_active: Optional active status filter
        match_type: Optional match type filter
        current_user: Authenticated user from JWT token
        
    Returns:
        Dictionary with keywords list
    """
    try:
        user_id = current_user.id
        keywords = await keyword_service.list_keywords(
            user_id=user_id,
            search=search,
            is_active=is_active,
            match_type=match_type,
        )
        
        return {"keywords": [keyword.model_dump() for keyword in keywords]}
    except AutoBidderError as e:
        logger.error(f"Error listing keywords: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Unexpected error listing keywords: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


@router.get(
    "/keywords/{keyword_id}",
    response_model=Keyword,
    status_code=status.HTTP_200_OK,
    summary="Get keyword by ID",
    description="Retrieves a specific keyword by ID",
)
async def get_keyword(
    keyword_id: str,
    current_user: UserResponse = Depends(get_current_user),
) -> Keyword:
    """
    Get a specific keyword by ID.
    
    Args:
        keyword_id: Keyword UUID
        current_user: Authenticated user from JWT token
        
    Returns:
        Keyword object
    """
    try:
        user_id = current_user.id
        keyword = await keyword_service.get_keyword(keyword_id, user_id)
        
        if not keyword:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Keyword not found",
            )
        
        return keyword
    except HTTPException:
        raise
    except AutoBidderError as e:
        logger.error(f"Error getting keyword: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Unexpected error getting keyword: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


@router.post(
    "/keywords",
    response_model=Keyword,
    status_code=status.HTTP_201_CREATED,
    summary="Create new keyword",
    description="Creates a new keyword for the authenticated user",
)
async def create_keyword(
    keyword_data: KeywordCreate,
    current_user: UserResponse = Depends(get_current_user),
) -> Keyword:
    """
    Create a new keyword.
    
    Args:
        keyword_data: Keyword creation data
        current_user: Authenticated user from JWT token
        
    Returns:
        Created Keyword object
    """
    try:
        user_id = current_user.id
        keyword = await keyword_service.create_keyword(user_id, keyword_data)
        return keyword
    except AutoBidderError as e:
        logger.error(f"Error creating keyword: {e}")
        error_detail = str(e)
        status_code = (
            status.HTTP_409_CONFLICT
            if "already exists" in error_detail.lower()
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(
            status_code=status_code,
            detail=error_detail,
        )
    except Exception as e:
        logger.error(f"Unexpected error creating keyword: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


@router.patch(
    "/keywords/{keyword_id}",
    response_model=Keyword,
    status_code=status.HTTP_200_OK,
    summary="Update keyword",
    description="Updates an existing keyword",
)
async def update_keyword(
    keyword_id: str,
    keyword_data: KeywordUpdate,
    current_user: UserResponse = Depends(get_current_user),
) -> Keyword:
    """
    Update an existing keyword.
    
    Args:
        keyword_id: Keyword UUID
        keyword_data: Keyword update data
        current_user: Authenticated user from JWT token
        
    Returns:
        Updated Keyword object
    """
    try:
        user_id = current_user.id
        keyword = await keyword_service.update_keyword(keyword_id, user_id, keyword_data)
        return keyword
    except AutoBidderError as e:
        logger.error(f"Error updating keyword: {e}")
        error_detail = str(e)
        status_code = (
            status.HTTP_404_NOT_FOUND
            if "not found" in error_detail.lower()
            else status.HTTP_409_CONFLICT
            if "already exists" in error_detail.lower()
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(
            status_code=status_code,
            detail=error_detail,
        )
    except Exception as e:
        logger.error(f"Unexpected error updating keyword: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


@router.delete(
    "/keywords/{keyword_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete keyword",
    description="Deletes a keyword by ID",
)
async def delete_keyword(
    keyword_id: str,
    current_user: UserResponse = Depends(get_current_user),
) -> None:
    """
    Delete a keyword.
    
    Args:
        keyword_id: Keyword UUID
        current_user: Authenticated user from JWT token
    """
    try:
        user_id = current_user.id
        await keyword_service.delete_keyword(keyword_id, user_id)
    except AutoBidderError as e:
        logger.error(f"Error deleting keyword: {e}")
        error_detail = str(e)
        status_code = (
            status.HTTP_404_NOT_FOUND
            if "not found" in error_detail.lower()
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(
            status_code=status_code,
            detail=error_detail,
        )
    except Exception as e:
        logger.error(f"Unexpected error deleting keyword: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


@router.get(
    "/keywords/{keyword_id}/stats",
    response_model=KeywordStats,
    status_code=status.HTTP_200_OK,
    summary="Get keyword statistics",
    description="Retrieves statistics for a keyword (jobs matched, last match date)",
)
async def get_keyword_stats(
    keyword_id: str,
    current_user: UserResponse = Depends(get_current_user),
) -> KeywordStats:
    """
    Get statistics for a keyword.
    
    Args:
        keyword_id: Keyword UUID
        current_user: Authenticated user from JWT token
        
    Returns:
        KeywordStats object
    """
    try:
        user_id = current_user.id
        stats = await keyword_service.get_keyword_stats(keyword_id, user_id)
        
        if not stats:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Keyword not found",
            )
        
        return stats
    except HTTPException:
        raise
    except AutoBidderError as e:
        logger.error(f"Error getting keyword stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Unexpected error getting keyword stats: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )
