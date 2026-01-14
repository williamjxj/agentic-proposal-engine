"""
Keyword Service

Service layer for keyword management operations.
Handles CRUD operations for keywords using Supabase.
"""

from typing import List, Optional
from datetime import datetime
import logging

from app.services.supabase_client import supabase_service
from app.models.keyword import Keyword, KeywordCreate, KeywordUpdate, KeywordStats
from app.core.errors import AutoBidderError

logger = logging.getLogger(__name__)


class KeywordService:
    """Service for managing keywords."""

    def __init__(self) -> None:
        """Initialize keyword service with Supabase client."""
        self.supabase = supabase_service

    async def list_keywords(
        self,
        user_id: str,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        match_type: Optional[str] = None,
    ) -> List[Keyword]:
        """
        List all keywords for a user with optional filters.

        Args:
            user_id: User UUID
            search: Search term to filter by keyword text or description
            is_active: Filter by active status
            match_type: Filter by match type (exact, partial, fuzzy)

        Returns:
            List of Keyword objects

        Raises:
            AutoBidderError: If query fails
        """
        try:
            query = (
                self.supabase.client.table("keywords")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
            )

            if search:
                query = query.or_(
                    f"keyword.ilike.%{search}%,description.ilike.%{search}%"
                )

            if is_active is not None:
                query = query.eq("is_active", is_active)

            if match_type:
                query = query.eq("match_type", match_type)

            response = query.execute()

            keywords = []
            for row in response.data:
                keywords.append(
                    Keyword(
                        id=row["id"],
                        user_id=row["user_id"],
                        keyword=row["keyword"],
                        description=row.get("description"),
                        is_active=row["is_active"],
                        match_type=row["match_type"],
                        jobs_matched=row.get("jobs_matched", 0),
                        last_match_at=row.get("last_match_at"),
                        created_at=datetime.fromisoformat(
                            row["created_at"].replace("Z", "+00:00")
                        ),
                        updated_at=datetime.fromisoformat(
                            row["updated_at"].replace("Z", "+00:00")
                        ),
                    )
                )

            return keywords
        except Exception as e:
            logger.error(f"Error listing keywords for user {user_id}: {e}")
            raise AutoBidderError(f"Failed to list keywords: {e}")

    async def get_keyword(self, keyword_id: str, user_id: str) -> Optional[Keyword]:
        """
        Get a specific keyword by ID.

        Args:
            keyword_id: Keyword UUID
            user_id: User UUID (for authorization)

        Returns:
            Keyword object or None if not found

        Raises:
            AutoBidderError: If query fails
        """
        try:
            response = (
                self.supabase.client.table("keywords")
                .select("*")
                .eq("id", keyword_id)
                .eq("user_id", user_id)
                .single()
                .execute()
            )

            if not response.data:
                return None

            row = response.data
            return Keyword(
                id=row["id"],
                user_id=row["user_id"],
                keyword=row["keyword"],
                description=row.get("description"),
                is_active=row["is_active"],
                match_type=row["match_type"],
                jobs_matched=row.get("jobs_matched", 0),
                last_match_at=row.get("last_match_at"),
                created_at=datetime.fromisoformat(
                    row["created_at"].replace("Z", "+00:00")
                ),
                updated_at=datetime.fromisoformat(
                    row["updated_at"].replace("Z", "+00:00")
                ),
            )
        except Exception as e:
            logger.error(f"Error getting keyword {keyword_id}: {e}")
            if "not found" in str(e).lower() or "no rows" in str(e).lower():
                return None
            raise AutoBidderError(f"Failed to get keyword: {e}")

    async def create_keyword(
        self, user_id: str, keyword_data: KeywordCreate
    ) -> Keyword:
        """
        Create a new keyword.

        Args:
            user_id: User UUID
            keyword_data: Keyword creation data

        Returns:
            Created Keyword object

        Raises:
            AutoBidderError: If creation fails (e.g., duplicate keyword)
        """
        try:
            # Check for duplicate keyword (case-insensitive)
            existing = (
                self.supabase.client.table("keywords")
                .select("id")
                .eq("user_id", user_id)
                .ilike("keyword", keyword_data.keyword)
                .execute()
            )

            if existing.data:
                raise AutoBidderError(
                    f"Keyword '{keyword_data.keyword}' already exists for this user"
                )

            # Insert new keyword
            response = (
                self.supabase.client.table("keywords")
                .insert(
                    {
                        "user_id": user_id,
                        "keyword": keyword_data.keyword,
                        "description": keyword_data.description,
                        "match_type": keyword_data.match_type,
                        "is_active": keyword_data.is_active,
                    }
                )
                .execute()
            )

            if not response.data:
                raise AutoBidderError("Failed to create keyword")

            row = response.data[0]
            return Keyword(
                id=row["id"],
                user_id=row["user_id"],
                keyword=row["keyword"],
                description=row.get("description"),
                is_active=row["is_active"],
                match_type=row["match_type"],
                jobs_matched=row.get("jobs_matched", 0),
                last_match_at=row.get("last_match_at"),
                created_at=datetime.fromisoformat(
                    row["created_at"].replace("Z", "+00:00")
                ),
                updated_at=datetime.fromisoformat(
                    row["updated_at"].replace("Z", "+00:00")
                ),
            )
        except AutoBidderError:
            raise
        except Exception as e:
            logger.error(f"Error creating keyword: {e}")
            raise AutoBidderError(f"Failed to create keyword: {e}")

    async def update_keyword(
        self, keyword_id: str, user_id: str, keyword_data: KeywordUpdate
    ) -> Keyword:
        """
        Update an existing keyword.

        Args:
            keyword_id: Keyword UUID
            user_id: User UUID (for authorization)
            keyword_data: Keyword update data

        Returns:
            Updated Keyword object

        Raises:
            AutoBidderError: If update fails or keyword not found
        """
        try:
            # Check if keyword exists and belongs to user
            existing = await self.get_keyword(keyword_id, user_id)
            if not existing:
                raise AutoBidderError("Keyword not found")

            # Check for duplicate if keyword text is being changed
            if keyword_data.keyword and keyword_data.keyword != existing.keyword:
                duplicate = (
                    self.supabase.client.table("keywords")
                    .select("id")
                    .eq("user_id", user_id)
                    .ilike("keyword", keyword_data.keyword)
                    .neq("id", keyword_id)
                    .execute()
                )

                if duplicate.data:
                    raise AutoBidderError(
                        f"Keyword '{keyword_data.keyword}' already exists for this user"
                    )

            # Build update dict (only include provided fields)
            update_data = {}
            if keyword_data.keyword is not None:
                update_data["keyword"] = keyword_data.keyword
            if keyword_data.description is not None:
                update_data["description"] = keyword_data.description
            if keyword_data.match_type is not None:
                update_data["match_type"] = keyword_data.match_type
            if keyword_data.is_active is not None:
                update_data["is_active"] = keyword_data.is_active

            if not update_data:
                return existing

            # Update keyword
            response = (
                self.supabase.client.table("keywords")
                .update(update_data)
                .eq("id", keyword_id)
                .eq("user_id", user_id)
                .execute()
            )

            if not response.data:
                raise AutoBidderError("Failed to update keyword")

            row = response.data[0]
            return Keyword(
                id=row["id"],
                user_id=row["user_id"],
                keyword=row["keyword"],
                description=row.get("description"),
                is_active=row["is_active"],
                match_type=row["match_type"],
                jobs_matched=row.get("jobs_matched", 0),
                last_match_at=row.get("last_match_at"),
                created_at=datetime.fromisoformat(
                    row["created_at"].replace("Z", "+00:00")
                ),
                updated_at=datetime.fromisoformat(
                    row["updated_at"].replace("Z", "+00:00")
                ),
            )
        except AutoBidderError:
            raise
        except Exception as e:
            logger.error(f"Error updating keyword {keyword_id}: {e}")
            raise AutoBidderError(f"Failed to update keyword: {e}")

    async def delete_keyword(self, keyword_id: str, user_id: str) -> None:
        """
        Delete a keyword.

        Args:
            keyword_id: Keyword UUID
            user_id: User UUID (for authorization)

        Raises:
            AutoBidderError: If deletion fails or keyword not found
        """
        try:
            # Check if keyword exists and belongs to user
            existing = await self.get_keyword(keyword_id, user_id)
            if not existing:
                raise AutoBidderError("Keyword not found")

            # Delete keyword
            response = (
                self.supabase.client.table("keywords")
                .delete()
                .eq("id", keyword_id)
                .eq("user_id", user_id)
                .execute()
            )

            if not response.data:
                raise AutoBidderError("Failed to delete keyword")

            logger.info(f"Deleted keyword {keyword_id} for user {user_id}")
        except AutoBidderError:
            raise
        except Exception as e:
            logger.error(f"Error deleting keyword {keyword_id}: {e}")
            raise AutoBidderError(f"Failed to delete keyword: {e}")

    async def get_keyword_stats(
        self, keyword_id: str, user_id: str
    ) -> Optional[KeywordStats]:
        """
        Get statistics for a keyword.

        Args:
            keyword_id: Keyword UUID
            user_id: User UUID (for authorization)

        Returns:
            KeywordStats object or None if keyword not found

        Raises:
            AutoBidderError: If query fails
        """
        try:
            keyword = await self.get_keyword(keyword_id, user_id)
            if not keyword:
                return None

            return KeywordStats(
                keyword_id=keyword.id,
                jobs_matched=keyword.jobs_matched,
                last_match_at=keyword.last_match_at,
            )
        except Exception as e:
            logger.error(f"Error getting keyword stats for {keyword_id}: {e}")
            raise AutoBidderError(f"Failed to get keyword stats: {e}")


# Singleton instance
keyword_service = KeywordService()
