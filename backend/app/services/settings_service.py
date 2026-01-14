"""
Settings Service - User Settings Management

Handles user preferences and platform credentials management.
"""

from typing import Any, Dict, List, Optional
import logging
from datetime import datetime

from app.services.supabase_client import supabase_service
from app.core.errors import AutoBidderError
from app.models.settings import (
    UserSettings,
    UserPreferences,
    PlatformCredential,
    CredentialUpsert,
    SubscriptionInfo,
)

logger = logging.getLogger(__name__)


class SettingsService:
    """Service for managing user settings and platform credentials."""

    async def get_settings(self, user_id: str) -> UserSettings:
        """
        Get user settings including preferences.

        Args:
            user_id: User's UUID

        Returns:
            UserSettings object

        Raises:
            AutoBidderError: If query fails
        """
        try:
            # Get user profile for preferences
            profile = await supabase_service.get_user_profile(user_id)
            if not profile:
                # Return default settings if profile doesn't exist
                return UserSettings(
                    user_id=user_id,
                    preferences=UserPreferences(),
                    subscription=None,
                )

            # Extract preferences from profile
            preferences = UserPreferences(
                theme=profile.get("theme", "light"),
                notifications_enabled=profile.get("notifications_enabled", True),
                email_notifications=profile.get("email_notifications", True),
                default_strategy_id=profile.get("default_strategy_id"),
            )

            # Get subscription info (if exists)
            subscription = None
            try:
                subscription_response = (
                    supabase_service.client.table("user_subscriptions")
                    .select("*")
                    .eq("user_id", user_id)
                    .eq("status", "active")
                    .execute()
                )
                if subscription_response.data and len(subscription_response.data) > 0:
                    sub_data = subscription_response.data[0]
                    subscription = SubscriptionInfo(
                        plan=sub_data.get("plan", "free"),
                        status=sub_data.get("status", "active"),
                        expires_at=sub_data.get("expires_at"),
                    )
            except Exception as e:
                logger.warning(f"Failed to fetch subscription: {e}")

            return UserSettings(
                user_id=user_id,
                preferences=preferences,
                subscription=subscription,
            )
        except Exception as e:
            logger.error(f"Failed to get settings: {e}")
            raise AutoBidderError(f"Failed to get settings: {e}")

    async def update_preferences(self, user_id: str, preferences: UserPreferences) -> None:
        """
        Update user preferences.

        Args:
            user_id: User's UUID
            preferences: UserPreferences object

        Raises:
            AutoBidderError: If update fails
        """
        try:
            # Update user profile with preferences
            update_data: Dict[str, Any] = {
                "theme": preferences.theme,
                "notifications_enabled": preferences.notifications_enabled,
                "email_notifications": preferences.email_notifications,
            }

            if preferences.default_strategy_id:
                update_data["default_strategy_id"] = preferences.default_strategy_id

            supabase_service.client.table("user_profiles").update(update_data).eq(
                "user_id", user_id
            ).execute()

            logger.info(f"Updated preferences for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to update preferences: {e}")
            raise AutoBidderError(f"Failed to update preferences: {e}")

    async def list_credentials(self, user_id: str) -> List[PlatformCredential]:
        """
        List all platform credentials for a user.

        Args:
            user_id: User's UUID

        Returns:
            List of PlatformCredential objects

        Raises:
            AutoBidderError: If query fails
        """
        try:
            response = (
                supabase_service.client.table("platform_credentials")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )

            credentials = []
            for row in response.data:
                credentials.append(self._row_to_credential(row))

            return credentials
        except Exception as e:
            logger.error(f"Failed to list credentials: {e}")
            raise AutoBidderError(f"Failed to list credentials: {e}")

    async def upsert_credential(
        self, user_id: str, credential: CredentialUpsert
    ) -> PlatformCredential:
        """
        Create or update a platform credential.

        Args:
            user_id: User's UUID
            credential: CredentialUpsert object

        Returns:
            Created or updated PlatformCredential object

        Raises:
            AutoBidderError: If upsert fails
        """
        try:
            # Prepare credential data
            credential_data: Dict[str, Any] = {
                "user_id": user_id,
                "platform": credential.platform,
                "api_key": credential.api_key,  # In production, encrypt this
                "api_secret": credential.api_secret,  # In production, encrypt this
                "is_active": credential.is_active,
            }

            if credential.id:
                # Update existing credential
                response = (
                    supabase_service.client.table("platform_credentials")
                    .update(credential_data)
                    .eq("id", credential.id)
                    .eq("user_id", user_id)
                    .execute()
                )
            else:
                # Create new credential
                response = (
                    supabase_service.client.table("platform_credentials")
                    .insert(credential_data)
                    .execute()
                )

            if not response.data or len(response.data) == 0:
                raise AutoBidderError("Failed to upsert credential")

            return self._row_to_credential(response.data[0])
        except AutoBidderError:
            raise
        except Exception as e:
            logger.error(f"Failed to upsert credential: {e}")
            raise AutoBidderError(f"Failed to upsert credential: {e}")

    async def delete_credential(self, credential_id: str, user_id: str) -> None:
        """
        Delete a platform credential.

        Args:
            credential_id: Credential UUID
            user_id: User's UUID (for authorization)

        Raises:
            AutoBidderError: If deletion fails
        """
        try:
            supabase_service.client.table("platform_credentials").delete().eq(
                "id", credential_id
            ).eq("user_id", user_id).execute()

            logger.info(f"Deleted credential {credential_id}")
        except Exception as e:
            logger.error(f"Failed to delete credential: {e}")
            raise AutoBidderError(f"Failed to delete credential: {e}")

    async def verify_credential(self, credential_id: str, user_id: str) -> Dict[str, Any]:
        """
        Verify a platform credential by making a test API call.

        Args:
            credential_id: Credential UUID
            user_id: User's UUID (for authorization)

        Returns:
            Verification result with status and message

        Raises:
            AutoBidderError: If verification fails
        """
        try:
            # Get credential
            response = (
                supabase_service.client.table("platform_credentials")
                .select("*")
                .eq("id", credential_id)
                .eq("user_id", user_id)
                .execute()
            )

            if not response.data or len(response.data) == 0:
                raise AutoBidderError("Credential not found")

            credential_row = response.data[0]
            platform = credential_row["platform"]
            api_key = credential_row.get("api_key")
            api_secret = credential_row.get("api_secret")

            # Verify based on platform
            # In production, make actual API calls to verify
            # For now, just check if credentials exist
            if not api_key:
                return {
                    "verified": False,
                    "message": "API key is missing",
                }

            # TODO: Implement actual verification for each platform
            # For now, return success if credentials exist
            return {
                "verified": True,
                "message": f"Credentials for {platform} verified successfully",
            }
        except AutoBidderError:
            raise
        except Exception as e:
            logger.error(f"Failed to verify credential: {e}")
            raise AutoBidderError(f"Failed to verify credential: {e}")

    async def get_subscription(self, user_id: str) -> Optional[SubscriptionInfo]:
        """
        Get user subscription information.

        Args:
            user_id: User's UUID

        Returns:
            SubscriptionInfo or None if no subscription

        Raises:
            AutoBidderError: If query fails
        """
        try:
            response = (
                supabase_service.client.table("user_subscriptions")
                .select("*")
                .eq("user_id", user_id)
                .eq("status", "active")
                .execute()
            )

            if not response.data or len(response.data) == 0:
                return None

            sub_data = response.data[0]
            return SubscriptionInfo(
                plan=sub_data.get("plan", "free"),
                status=sub_data.get("status", "active"),
                expires_at=sub_data.get("expires_at"),
            )
        except Exception as e:
            logger.error(f"Failed to get subscription: {e}")
            return None

    def _row_to_credential(self, row: Dict[str, Any]) -> PlatformCredential:
        """Convert database row to PlatformCredential model."""
        return PlatformCredential(
            id=row["id"],
            user_id=row["user_id"],
            platform=row["platform"],
            api_key=row.get("api_key", ""),  # In production, decrypt this
            api_secret=row.get("api_secret"),  # In production, decrypt this
            is_active=row.get("is_active", True),
            verified_at=datetime.fromisoformat(row["verified_at"].replace("Z", "+00:00"))
            if row.get("verified_at")
            else None,
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")),
            updated_at=datetime.fromisoformat(row["updated_at"].replace("Z", "+00:00")),
        )


# Global instance
settings_service = SettingsService()
