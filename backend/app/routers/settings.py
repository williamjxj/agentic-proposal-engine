"""
Settings Router

API endpoints for managing user settings and platform credentials.
"""

from typing import List, Optional
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.services.settings_service import settings_service
from app.models.settings import (
    UserSettings,
    UserPreferences,
    PlatformCredential,
    CredentialUpsert,
    SubscriptionInfo,
)
from app.core.errors import AutoBidderError

logger = logging.getLogger(__name__)

router = APIRouter()
security = HTTPBearer()


async def get_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Extract user_id from JWT token.

    In production, this should validate the JWT and extract user_id.
    For now, we'll use a simple header-based approach.
    """
    # TODO: Implement proper JWT validation
    # For now, we'll use a header-based approach
    # In production, decode JWT and extract user_id
    return credentials.credentials if credentials else "default-user"


@router.get("/settings", response_model=UserSettings, tags=["settings"])
async def get_settings(user_id: str = Depends(get_user_id)) -> UserSettings:
    """
    Get user settings including preferences.

    Args:
        user_id: Authenticated user ID

    Returns:
        UserSettings object
    """
    try:
        return await settings_service.get_settings(user_id)
    except AutoBidderError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting settings: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/settings/preferences", tags=["settings"])
async def update_preferences(
    preferences: UserPreferences, user_id: str = Depends(get_user_id)
) -> dict:
    """
    Update user preferences.

    Args:
        preferences: UserPreferences object
        user_id: Authenticated user ID

    Returns:
        Success message
    """
    try:
        await settings_service.update_preferences(user_id, preferences)
        return {"message": "Preferences updated successfully"}
    except AutoBidderError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating preferences: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/settings/credentials", response_model=List[PlatformCredential], tags=["settings"])
async def list_credentials(user_id: str = Depends(get_user_id)) -> List[PlatformCredential]:
    """
    List all platform credentials for the authenticated user.

    Args:
        user_id: Authenticated user ID

    Returns:
        List of credentials
    """
    try:
        return await settings_service.list_credentials(user_id)
    except AutoBidderError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error listing credentials: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/settings/credentials", response_model=PlatformCredential, tags=["settings"])
async def create_credential(
    credential: CredentialUpsert, user_id: str = Depends(get_user_id)
) -> PlatformCredential:
    """
    Create a new platform credential.

    Args:
        credential: CredentialUpsert object
        user_id: Authenticated user ID

    Returns:
        Created credential object
    """
    try:
        return await settings_service.upsert_credential(user_id, credential)
    except AutoBidderError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating credential: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/settings/credentials/{credential_id}", response_model=PlatformCredential, tags=["settings"])
async def update_credential(
    credential_id: str,
    credential: CredentialUpsert,
    user_id: str = Depends(get_user_id),
) -> PlatformCredential:
    """
    Update an existing platform credential.

    Args:
        credential_id: Credential UUID
        credential: CredentialUpsert object
        user_id: Authenticated user ID

    Returns:
        Updated credential object
    """
    try:
        credential.id = credential_id
        return await settings_service.upsert_credential(user_id, credential)
    except AutoBidderError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating credential: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/settings/credentials/{credential_id}", tags=["settings"])
async def delete_credential(credential_id: str, user_id: str = Depends(get_user_id)) -> dict:
    """
    Delete a platform credential.

    Args:
        credential_id: Credential UUID
        user_id: Authenticated user ID

    Returns:
        Success message
    """
    try:
        await settings_service.delete_credential(credential_id, user_id)
        return {"message": "Credential deleted successfully"}
    except AutoBidderError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting credential: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/settings/credentials/{credential_id}/verify", tags=["settings"])
async def verify_credential(credential_id: str, user_id: str = Depends(get_user_id)) -> dict:
    """
    Verify a platform credential.

    Args:
        credential_id: Credential UUID
        user_id: Authenticated user ID

    Returns:
        Verification result
    """
    try:
        result = await settings_service.verify_credential(credential_id, user_id)
        return result
    except AutoBidderError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error verifying credential: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/settings/subscription", response_model=Optional[SubscriptionInfo], tags=["settings"])
async def get_subscription(user_id: str = Depends(get_user_id)) -> Optional[SubscriptionInfo]:
    """
    Get user subscription information.

    Args:
        user_id: Authenticated user ID

    Returns:
        SubscriptionInfo or None
    """
    try:
        return await settings_service.get_subscription(user_id)
    except Exception as e:
        logger.error(f"Error getting subscription: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
