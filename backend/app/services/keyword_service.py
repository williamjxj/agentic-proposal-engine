"""
Keyword Service

Service layer for keyword management operations.
Handles CRUD operations for keywords using PostgreSQL.
"""

from typing import List, Optional
from datetime import datetime
import logging

from app.core.database import get_db_pool
from app.models.keyword import Keyword, KeywordCreate, KeywordUpdate, KeywordStats
from app.core.errors import AutoBidderError

logger = logging.getLogger(__name__)


class KeywordService:
    """Service for managing keywords."""

    def __init__(self) -> None:
        """Initialize keyword service with PostgreSQL connection pool."""
        pass

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
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                # Build dynamic query based on filters
                query = """
                    SELECT * FROM keywords
                    WHERE user_id = $1
                """
                params = [user_id]
                param_count = 1

                if search:
                    param_count += 1
                    query += f" AND (keyword ILIKE ${param_count} OR description ILIKE ${param_count})"
                    params.append(f"%{search}%")

                if is_active is not None:
                    param_count += 1
                    query += f" AND is_active = ${param_count}"
                    params.append(is_active)

                if match_type:
                    param_count += 1
                    query += f" AND match_type = ${param_count}"
                    params.append(match_type)

                query += " ORDER BY created_at DESC"

                rows = await conn.fetch(query, *params)

                keywords = []
                for row in rows:
                    keywords.append(
                        Keyword(
                            id=str(row["id"]),
                            user_id=str(row["user_id"]),
                            keyword=row["keyword"],
                            description=row.get("description"),
                            is_active=row["is_active"],
                            match_type=row["match_type"],
                            jobs_matched=row.get("jobs_matched", 0),
                            last_match_at=row.get("last_match_at"),
                            created_at=row["created_at"],
                            updated_at=row["updated_at"],
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
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    SELECT * FROM keywords
                    WHERE id = $1 AND user_id = $2
                    """,
                    keyword_id,
                    user_id
                )

                if not row:
                    return None

                return Keyword(
                    id=str(row["id"]),
                    user_id=str(row["user_id"]),
                    keyword=row["keyword"],
                    description=row.get("description"),
                    is_active=row["is_active"],
                    match_type=row["match_type"],
                    jobs_matched=row.get("jobs_matched", 0),
                    last_match_at=row.get("last_match_at"),
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
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
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                # Check for duplicate keyword (case-insensitive)
                existing = await conn.fetchrow(
                    """
                    SELECT id FROM keywords
                    WHERE user_id = $1 AND LOWER(keyword) = LOWER($2)
                    """,
                    user_id,
                    keyword_data.keyword
                )

                if existing:
                    raise AutoBidderError(
                        f"Keyword '{keyword_data.keyword}' already exists for this user"
                    )

                # Insert new keyword
                row = await conn.fetchrow(
                    """
                    INSERT INTO keywords (user_id, keyword, description, match_type, is_active)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *
                    """,
                    user_id,
                    keyword_data.keyword,
                    keyword_data.description,
                    keyword_data.match_type,
                    keyword_data.is_active,
                )

                if not row:
                    raise AutoBidderError("Failed to create keyword")

                return Keyword(
                    id=str(row["id"]),
                    user_id=str(row["user_id"]),
                    keyword=row["keyword"],
                    description=row.get("description"),
                    is_active=row["is_active"],
                    match_type=row["match_type"],
                    jobs_matched=row.get("jobs_matched", 0),
                    last_match_at=row.get("last_match_at"),
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
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

            pool = await get_db_pool()
            async with pool.acquire() as conn:
                # Check for duplicate if keyword text is being changed
                if keyword_data.keyword and keyword_data.keyword != existing.keyword:
                    duplicate = await conn.fetchrow(
                        """
                        SELECT id FROM keywords
                        WHERE user_id = $1 AND LOWER(keyword) = LOWER($2) AND id != $3
                        """,
                        user_id,
                        keyword_data.keyword,
                        keyword_id
                    )

                    if duplicate:
                        raise AutoBidderError(
                            f"Keyword '{keyword_data.keyword}' already exists for this user"
                        )

                # Build update dict (only include provided fields)
                update_fields = []
                params = []
                param_count = 0

                if keyword_data.keyword is not None:
                    param_count += 1
                    update_fields.append(f"keyword = ${param_count}")
                    params.append(keyword_data.keyword)

                if keyword_data.description is not None:
                    param_count += 1
                    update_fields.append(f"description = ${param_count}")
                    params.append(keyword_data.description)

                if keyword_data.match_type is not None:
                    param_count += 1
                    update_fields.append(f"match_type = ${param_count}")
                    params.append(keyword_data.match_type)

                if keyword_data.is_active is not None:
                    param_count += 1
                    update_fields.append(f"is_active = ${param_count}")
                    params.append(keyword_data.is_active)

                if not update_fields:
                    return existing

                # Add updated_at (no parameter needed since it uses CURRENT_TIMESTAMP)
                update_fields.append(f"updated_at = CURRENT_TIMESTAMP")

                # Add WHERE clause params
                param_count += 1
                params.append(keyword_id)
                keyword_id_param = param_count

                param_count += 1
                params.append(user_id)
                user_id_param = param_count

                query = f"""
                    UPDATE keywords
                    SET {', '.join(update_fields)}
                    WHERE id = ${keyword_id_param} AND user_id = ${user_id_param}
                    RETURNING *
                """

                row = await conn.fetchrow(query, *params)

                if not row:
                    raise AutoBidderError("Failed to update keyword")

                return Keyword(
                    id=str(row["id"]),
                    user_id=str(row["user_id"]),
                    keyword=row["keyword"],
                    description=row.get("description"),
                    is_active=row["is_active"],
                    match_type=row["match_type"],
                    jobs_matched=row.get("jobs_matched", 0),
                    last_match_at=row.get("last_match_at"),
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
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

            pool = await get_db_pool()
            async with pool.acquire() as conn:
                # Delete keyword
                result = await conn.execute(
                    """
                    DELETE FROM keywords
                    WHERE id = $1 AND user_id = $2
                    """,
                    keyword_id,
                    user_id
                )

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
