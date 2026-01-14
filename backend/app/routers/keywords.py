"""
Keywords Router

FastAPI router for keyword management endpoints.
Implements API contract from contracts/keywords-api.yaml
"""

from typing import Optional
import logging
from fastapi import APIRouter, HTTPException, Header, Query, status
from fastapi.responses import JSONResponse

from app.models.keyword import (
    Keyword,
    KeywordCreate,
    KeywordUpdate,
    KeywordStats,
)
from app.services.keyword_service import keyword_service
from app.core.errors import AutoBidderError

logger = logging.getLogger(__name__)

router = APIRouter()


def get_user_id_from_token(authorization: Optional[str] = Header(None)) -> str:
    """
    Extract user ID from authorization token.
    
    Args:
        authorization: Authorization header (Bearer token)
        
    Returns:
        User ID extracted from token
        
    Raises:
        HTTPException: If authorization is missing or invalid
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required",
        )
    
    # TODO: Implement proper JWT decoding and validation with Supabase
    # For now, using placeholder similar to session router
    try:
        token = authorization.replace("Bearer ", "")
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authorization token",
            )
        
        # Placeholder: return dummy user ID for testing
        # In production, this must be replaced with real JWT verification
        return "00000000-0000-0000-0000-000000000001"
    except Exception as e:
        logger.error(f"Error extracting user ID from token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization token",
        )


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
    authorization: Optional[str] = Header(None),
) -> dict:
    """
    List all keywords for the authenticated user.
    
    Args:
        search: Optional search term
        is_active: Optional active status filter
        match_type: Optional match type filter
        authorization: Bearer token
        
    Returns:
        Dictionary with keywords list
    """
    try:
        user_id = get_user_id_from_token(authorization)
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
    authorization: Optional[str] = Header(None),
) -> Keyword:
    """
    Get a specific keyword by ID.
    
    Args:
        keyword_id: Keyword UUID
        authorization: Bearer token
        
    Returns:
        Keyword object
    """
    try:
        user_id = get_user_id_from_token(authorization)
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
    authorization: Optional[str] = Header(None),
) -> Keyword:
    """
    Create a new keyword.
    
    Args:
        keyword_data: Keyword creation data
        authorization: Bearer token
        
    Returns:
        Created Keyword object
    """
    try:
        user_id = get_user_id_from_token(authorization)
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
    authorization: Optional[str] = Header(None),
) -> Keyword:
    """
    Update an existing keyword.
    
    Args:
        keyword_id: Keyword UUID
        keyword_data: Keyword update data
        authorization: Bearer token
        
    Returns:
        Updated Keyword object
    """
    try:
        user_id = get_user_id_from_token(authorization)
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
    authorization: Optional[str] = Header(None),
) -> None:
    """
    Delete a keyword.
    
    Args:
        keyword_id: Keyword UUID
        authorization: Bearer token
    """
    try:
        user_id = get_user_id_from_token(authorization)
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
    authorization: Optional[str] = Header(None),
) -> KeywordStats:
    """
    Get statistics for a keyword.
    
    Args:
        keyword_id: Keyword UUID
        authorization: Bearer token
        
    Returns:
        KeywordStats object
    """
    try:
        user_id = get_user_id_from_token(authorization)
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
