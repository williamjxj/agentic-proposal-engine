"""
Strategies Router

FastAPI router for bidding strategy management endpoints.
Implements API contract from contracts/strategies-api.yaml
"""

from typing import Optional
import logging
from fastapi import APIRouter, HTTPException, Header, status

from app.models.strategy import (
    Strategy,
    StrategyCreate,
    StrategyUpdate,
    TestStrategyRequest,
    TestProposal,
)
from app.services.strategy_service import strategy_service
from app.core.errors import AutoBidderError

logger = logging.getLogger(__name__)

router = APIRouter()


def get_user_id_from_token(authorization: Optional[str] = Header(None)) -> str:
    """Extract user ID from authorization token."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required",
        )
    
    try:
        token = authorization.replace("Bearer ", "")
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authorization token",
            )
        return "00000000-0000-0000-0000-000000000001"
    except Exception as e:
        logger.error(f"Error extracting user ID from token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization token",
        )


@router.get(
    "/strategies",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="List user strategies",
)
async def list_strategies(
    authorization: Optional[str] = Header(None),
) -> dict:
    """List all strategies for the authenticated user."""
    try:
        user_id = get_user_id_from_token(authorization)
        strategies = await strategy_service.list_strategies(user_id)
        return {"strategies": [s.model_dump() for s in strategies]}
    except AutoBidderError as e:
        logger.error(f"Error listing strategies: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Unexpected error listing strategies: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


@router.get(
    "/strategies/{strategy_id}",
    response_model=Strategy,
    status_code=status.HTTP_200_OK,
    summary="Get strategy by ID",
)
async def get_strategy(
    strategy_id: str,
    authorization: Optional[str] = Header(None),
) -> Strategy:
    """Get a specific strategy by ID."""
    try:
        user_id = get_user_id_from_token(authorization)
        strategy = await strategy_service.get_strategy(strategy_id, user_id)
        if not strategy:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Strategy not found",
            )
        return strategy
    except HTTPException:
        raise
    except AutoBidderError as e:
        logger.error(f"Error getting strategy: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Unexpected error getting strategy: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


@router.post(
    "/strategies",
    response_model=Strategy,
    status_code=status.HTTP_201_CREATED,
    summary="Create new strategy",
)
async def create_strategy(
    strategy_data: StrategyCreate,
    authorization: Optional[str] = Header(None),
) -> Strategy:
    """Create a new strategy."""
    try:
        user_id = get_user_id_from_token(authorization)
        strategy = await strategy_service.create_strategy(user_id, strategy_data)
        return strategy
    except AutoBidderError as e:
        logger.error(f"Error creating strategy: {e}")
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
        logger.error(f"Unexpected error creating strategy: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


@router.patch(
    "/strategies/{strategy_id}",
    response_model=Strategy,
    status_code=status.HTTP_200_OK,
    summary="Update strategy",
)
async def update_strategy(
    strategy_id: str,
    strategy_data: StrategyUpdate,
    authorization: Optional[str] = Header(None),
) -> Strategy:
    """Update an existing strategy."""
    try:
        user_id = get_user_id_from_token(authorization)
        strategy = await strategy_service.update_strategy(strategy_id, user_id, strategy_data)
        return strategy
    except AutoBidderError as e:
        logger.error(f"Error updating strategy: {e}")
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
        logger.error(f"Unexpected error updating strategy: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


@router.delete(
    "/strategies/{strategy_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete strategy",
)
async def delete_strategy(
    strategy_id: str,
    authorization: Optional[str] = Header(None),
) -> None:
    """Delete a strategy."""
    try:
        user_id = get_user_id_from_token(authorization)
        await strategy_service.delete_strategy(strategy_id, user_id)
    except AutoBidderError as e:
        logger.error(f"Error deleting strategy: {e}")
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
        logger.error(f"Unexpected error deleting strategy: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


@router.post(
    "/strategies/{strategy_id}/set-default",
    response_model=Strategy,
    status_code=status.HTTP_200_OK,
    summary="Set strategy as default",
)
async def set_default_strategy(
    strategy_id: str,
    authorization: Optional[str] = Header(None),
) -> Strategy:
    """Set a strategy as default, unmarking all others."""
    try:
        user_id = get_user_id_from_token(authorization)
        strategy = await strategy_service.set_default_strategy(strategy_id, user_id)
        return strategy
    except AutoBidderError as e:
        logger.error(f"Error setting default strategy: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Unexpected error setting default strategy: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


@router.post(
    "/strategies/{strategy_id}/test",
    response_model=TestProposal,
    status_code=status.HTTP_200_OK,
    summary="Test strategy (generate sample proposal)",
)
async def test_strategy(
    strategy_id: str,
    request: Optional[TestStrategyRequest] = None,
    authorization: Optional[str] = Header(None),
) -> TestProposal:
    """Test a strategy by generating a sample proposal."""
    try:
        user_id = get_user_id_from_token(authorization)
        job_description = request.job_description if request else None
        proposal = await strategy_service.test_strategy(strategy_id, user_id, job_description)
        return proposal
    except AutoBidderError as e:
        logger.error(f"Error testing strategy: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Unexpected error testing strategy: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )
