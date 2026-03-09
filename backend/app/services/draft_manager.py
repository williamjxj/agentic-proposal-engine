"""
Draft Manager Service

Manages draft work operations including CRUD and cleanup.
Uses PostgreSQL connection pool for database operations.
"""

from typing import Optional, List, Dict, Any
import logging
import json
from datetime import datetime, timedelta

from app.models.draft import (
    Draft,
    DraftCreate,
    DraftUpdate,
    DraftSaveRequest,
)
from app.core.database import get_db_pool
from app.services.conflict_resolver import ConflictResolver
from app.core.errors import AutoBidderError, ConflictError
from app.config import settings

logger = logging.getLogger(__name__)


class DraftManager:
    """
    Manages draft operations for users.

    Provides methods to list, get, save, delete drafts with
    proper validation, conflict detection, and error handling.
    """

    def __init__(self) -> None:
        """Initialize draft manager."""
        self.conflict_resolver = ConflictResolver()

    def _row_to_draft(self, row) -> Draft:
        """
        Convert database row to Draft model.

        Handles UUID to string conversion for Pydantic validation.
        """
        return Draft(
            id=str(row["id"]),
            user_id=str(row["user_id"]),
            entity_type=row["entity_type"],
            entity_id=str(row["entity_id"]) if row["entity_id"] else None,
            draft_data=row["draft_data"],
            version=row["version"],
            last_saved_at=row["last_saved_at"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    async def list_drafts(self, user_id: str) -> List[Draft]:
        """
        List all active drafts for user.

        Args:
            user_id: User's UUID

        Returns:
            List of Draft objects
        """
        try:
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT id, user_id, entity_type, entity_id, draft_data,
                           draft_version as version, last_auto_save_at as last_saved_at,
                           created_at, updated_at
                    FROM draft_work
                    WHERE user_id = $1
                    ORDER BY updated_at DESC
                    """,
                    user_id
                )
                return [self._row_to_draft(row) for row in rows]
        except Exception as e:
            logger.error(f"Error listing drafts for user {user_id}: {e}")
            raise AutoBidderError(f"Failed to list drafts: {e}")

    async def get_draft(
        self,
        user_id: str,
        entity_type: str,
        entity_id: Optional[str],
    ) -> Optional[Draft]:
        """
        Get specific draft.

        Args:
            user_id: User's UUID
            entity_type: Type of entity
            entity_id: Entity ID (None for new entities)

        Returns:
            Draft object or None if not found
        """
        try:
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    SELECT id, user_id, entity_type, entity_id, draft_data,
                           draft_version as version, last_auto_save_at as last_saved_at,
                           created_at, updated_at
                    FROM draft_work
                    WHERE user_id = $1 AND entity_type = $2 AND entity_id IS NOT DISTINCT FROM $3
                    """,
                    user_id,
                    entity_type,
                    entity_id
                )

                if not row:
                    return None

                return self._row_to_draft(row)
        except Exception as e:
            logger.error(f"Error getting draft: {e}")
            raise AutoBidderError(f"Failed to get draft: {e}")

    async def save_draft(
        self,
        user_id: str,
        entity_type: str,
        entity_id: Optional[str],
        draft_request: DraftSaveRequest,
    ) -> Draft:
        """
        Save draft with conflict detection.

        Args:
            user_id: User's UUID
            entity_type: Type of entity
            entity_id: Entity ID (None for new entities)
            draft_request: Draft save request with data and version

        Returns:
            Saved Draft object

        Raises:
            AutoBidderError: If save fails or conflict detected
        """
        try:
            # Check for existing draft
            existing = await self.get_draft(user_id, entity_type, entity_id)

            # Detect version conflict
            if existing:
                has_conflict = self.conflict_resolver.detect_conflict(
                    client_version=draft_request.version,
                    server_version=existing.version,
                )

                if has_conflict:
                    conflict_info = {
                        "server_version": existing.version,
                        "client_version": draft_request.version,
                        "server_updated_at": existing.updated_at,
                    }
                    raise ConflictError(
                        "Version conflict detected",
                        details=conflict_info,
                    )

            # Increment version
            new_version = (existing.version + 1) if existing else 1

            # Save to database
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                if existing:
                    # Update existing draft
                    row = await conn.fetchrow(
                        """
                        UPDATE draft_work
                        SET draft_data = $1,
                            draft_version = $2,
                            last_auto_save_at = $3,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE user_id = $4 AND entity_type = $5 AND entity_id IS NOT DISTINCT FROM $6
                        RETURNING id, user_id, entity_type, entity_id, draft_data,
                                  draft_version as version, last_auto_save_at as last_saved_at,
                                  created_at, updated_at
                        """,
                        json.dumps(draft_request.draft_data, ensure_ascii=False),
                        new_version,
                        datetime.now(),
                        user_id,
                        entity_type,
                        entity_id,
                    )
                else:
                    # Insert new draft
                    row = await conn.fetchrow(
                        """
                        INSERT INTO draft_work
                        (user_id, entity_type, entity_id, draft_data, draft_version, last_auto_save_at)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        RETURNING id, user_id, entity_type, entity_id, draft_data,
                                  draft_version as version, last_auto_save_at as last_saved_at,
                                  created_at, updated_at
                        """,
                        user_id,
                        entity_type,
                        entity_id,
                        json.dumps(draft_request.draft_data, ensure_ascii=False),
                        new_version,
                        datetime.now(),
                    )

                return self._row_to_draft(row)
        except AutoBidderError:
            raise
        except Exception as e:
            logger.error(f"Error saving draft: {e}")
            raise AutoBidderError(f"Failed to save draft: {e}")

    async def delete_draft(
        self,
        user_id: str,
        entity_type: str,
        entity_id: Optional[str],
    ) -> None:
        """
        Delete draft.

        Args:
            user_id: User's UUID
            entity_type: Type of entity
            entity_id: Entity ID (None for new entities)
        """
        try:
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    DELETE FROM draft_work
                    WHERE user_id = $1 AND entity_type = $2 AND entity_id IS NOT DISTINCT FROM $3
                    """,
                    user_id,
                    entity_type,
                    entity_id
                )
            logger.info(f"Deleted draft for {entity_type}:{entity_id}")
        except Exception as e:
            logger.error(f"Error deleting draft: {e}")
            # Don't raise - deletion is non-critical

    async def cleanup_expired(self, retention_hours: Optional[int] = None) -> int:
        """
        Clean up expired drafts older than retention period.

        Args:
            retention_hours: Retention period in hours (uses config if not provided)

        Returns:
            Number of drafts cleaned up
        """
        try:
            if retention_hours is None:
                retention_hours = settings.draft_retention_hours

            # Calculate cutoff time
            cutoff_time = datetime.now() - timedelta(hours=retention_hours)

            logger.info(f"Starting draft cleanup (retention: {retention_hours}h, cutoff: {cutoff_time})")

            pool = await get_db_pool()
            async with pool.acquire() as conn:
                result = await conn.execute(
                    """
                    DELETE FROM draft_work
                    WHERE updated_at < $1
                    """,
                    cutoff_time
                )
                # Parse result like "DELETE 5" to get count
                count = int(result.split()[-1]) if result else 0
                logger.info(f"Cleaned up {count} expired drafts")
                return count
        except Exception as e:
            logger.error(f"Error cleaning up expired drafts: {e}")
            return 0


# Global instance
draft_manager = DraftManager()
