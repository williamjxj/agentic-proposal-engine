"""
Strategy Service

Service layer for bidding strategy management operations.
Handles CRUD operations for strategies using PostgreSQL.
"""

from typing import List, Optional
from datetime import datetime
from decimal import Decimal
import logging
import json

from app.core.database import get_db_pool
from app.models.strategy import Strategy, StrategyCreate, StrategyUpdate, TestProposal
from app.models.ai import ProposalGenerateRequest
from app.core.errors import AutoBidderError

logger = logging.getLogger(__name__)


class StrategyService:
    """Service for managing bidding strategies."""

    def __init__(self) -> None:
        """Initialize strategy service with PostgreSQL connection pool."""
        pass

    async def list_strategies(self, user_id: str) -> List[Strategy]:
        """
        List all strategies for a user.

        Args:
            user_id: User UUID

        Returns:
            List of Strategy objects

        Raises:
            AutoBidderError: If query fails
        """
        try:
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT * FROM bidding_strategies
                    WHERE user_id = $1
                    ORDER BY is_default DESC, created_at DESC
                    """,
                    user_id
                )
                
                strategies = []
                for row in rows:
                    strategies.append(self._row_to_strategy(row))
                
                return strategies
        except Exception as e:
            logger.error(f"Error listing strategies for user {user_id}: {e}")
            raise AutoBidderError(f"Failed to list strategies: {e}")

    async def get_strategy(
        self, strategy_id: str, user_id: str
    ) -> Optional[Strategy]:
        """
        Get a specific strategy by ID.

        Args:
            strategy_id: Strategy UUID
            user_id: User UUID (for authorization)

        Returns:
            Strategy object or None if not found

        Raises:
            AutoBidderError: If query fails
        """
        try:
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    SELECT * FROM bidding_strategies
                    WHERE id = $1 AND user_id = $2
                    """,
                    strategy_id,
                    user_id
                )
                
                if not row:
                    return None
                
                return self._row_to_strategy(row)
        except Exception as e:
            logger.error(f"Error getting strategy {strategy_id}: {e}")
            if "not found" in str(e).lower() or "no rows" in str(e).lower():
                return None
            raise AutoBidderError(f"Failed to get strategy: {e}")

    async def create_strategy(
        self, user_id: str, strategy_data: StrategyCreate
    ) -> Strategy:
        """
        Create a new strategy.

        Args:
            user_id: User UUID
            strategy_data: Strategy creation data

        Returns:
            Created Strategy object

        Raises:
            AutoBidderError: If creation fails (e.g., duplicate name)
        """
        try:
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                # Check for duplicate name (case-insensitive)
                existing = await conn.fetchrow(
                    """
                    SELECT id FROM bidding_strategies
                    WHERE user_id = $1 AND LOWER(name) = LOWER($2)
                    """,
                    user_id,
                    strategy_data.name
                )
                
                if existing:
                    raise AutoBidderError(
                        f"Strategy '{strategy_data.name}' already exists for this user"
                    )
                
                # If setting as default, unmark other defaults
                if strategy_data.is_default:
                    await self._unmark_other_defaults(user_id)
                
                # Insert new strategy
                row = await conn.fetchrow(
                    """
                    INSERT INTO bidding_strategies 
                    (user_id, name, description, system_prompt, tone, focus_areas, 
                     temperature, max_tokens, is_default)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    RETURNING *
                    """,
                    user_id,
                    strategy_data.name,
                    strategy_data.description,
                    strategy_data.system_prompt,
                    strategy_data.tone,
                    json.dumps(strategy_data.focus_areas),  # Convert list to JSON string for JSONB
                    float(strategy_data.temperature),
                    strategy_data.max_tokens,
                    strategy_data.is_default,
                )
                
                if not row:
                    raise AutoBidderError("Failed to create strategy")
                
                return self._row_to_strategy(row)
        except AutoBidderError:
            raise
        except Exception as e:
            logger.error(f"Error creating strategy: {e}")
            raise AutoBidderError(f"Failed to create strategy: {e}")

    async def update_strategy(
        self, strategy_id: str, user_id: str, strategy_data: StrategyUpdate
    ) -> Strategy:
        """
        Update an existing strategy.

        Args:
            strategy_id: Strategy UUID
            user_id: User UUID (for authorization)
            strategy_data: Strategy update data

        Returns:
            Updated Strategy object

        Raises:
            AutoBidderError: If update fails or strategy not found
        """
        try:
            # Check if strategy exists and belongs to user
            existing = await self.get_strategy(strategy_id, user_id)
            if not existing:
                raise AutoBidderError("Strategy not found")
            
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                # Check for duplicate if name is being changed
                if strategy_data.name and strategy_data.name != existing.name:
                    duplicate = await conn.fetchrow(
                        """
                        SELECT id FROM bidding_strategies
                        WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND id != $3
                        """,
                        user_id,
                        strategy_data.name,
                        strategy_id
                    )
                    
                    if duplicate:
                        raise AutoBidderError(
                            f"Strategy '{strategy_data.name}' already exists for this user"
                        )
                
                # Build update query dynamically
                update_fields = []
                params = []
                param_count = 0
                
                if strategy_data.name is not None:
                    param_count += 1
                    update_fields.append(f"name = ${param_count}")
                    params.append(strategy_data.name)
                
                if strategy_data.description is not None:
                    param_count += 1
                    update_fields.append(f"description = ${param_count}")
                    params.append(strategy_data.description)
                
                if strategy_data.system_prompt is not None:
                    param_count += 1
                    update_fields.append(f"system_prompt = ${param_count}")
                    params.append(strategy_data.system_prompt)
                
                if strategy_data.tone is not None:
                    param_count += 1
                    update_fields.append(f"tone = ${param_count}")
                    params.append(strategy_data.tone)
                
                if strategy_data.focus_areas is not None:
                    param_count += 1
                    update_fields.append(f"focus_areas = ${param_count}")
                    params.append(json.dumps(strategy_data.focus_areas))  # Convert list to JSON string for JSONB
                
                if strategy_data.temperature is not None:
                    param_count += 1
                    update_fields.append(f"temperature = ${param_count}")
                    params.append(float(str(strategy_data.temperature)))
                
                if strategy_data.max_tokens is not None:
                    param_count += 1
                    update_fields.append(f"max_tokens = ${param_count}")
                    params.append(strategy_data.max_tokens)
                
                if not update_fields:
                    return existing
                
                # Add updated_at
                update_fields.append("updated_at = CURRENT_TIMESTAMP")
                
                # Add WHERE clause params
                param_count += 1
                params.append(strategy_id)
                strategy_id_param = param_count
                
                param_count += 1
                params.append(user_id)
                user_id_param = param_count
                
                query = f"""
                    UPDATE bidding_strategies
                    SET {', '.join(update_fields)}
                    WHERE id = ${strategy_id_param} AND user_id = ${user_id_param}
                    RETURNING *
                """
                
                row = await conn.fetchrow(query, *params)
                
                if not row:
                    raise AutoBidderError("Failed to update strategy")
                
                return self._row_to_strategy(row)
        except AutoBidderError:
            raise
        except Exception as e:
            logger.error(f"Error updating strategy {strategy_id}: {e}")
            raise AutoBidderError(f"Failed to update strategy: {e}")

    async def delete_strategy(self, strategy_id: str, user_id: str) -> None:
        """
        Delete a strategy.

        Args:
            strategy_id: Strategy UUID
            user_id: User UUID (for authorization)

        Raises:
            AutoBidderError: If deletion fails or strategy not found
        """
        try:
            # Check if strategy exists and belongs to user
            existing = await self.get_strategy(strategy_id, user_id)
            if not existing:
                raise AutoBidderError("Strategy not found")
            
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    DELETE FROM bidding_strategies
                    WHERE id = $1 AND user_id = $2
                    """,
                    strategy_id,
                    user_id
                )
                
                logger.info(f"Deleted strategy {strategy_id} for user {user_id}")
        except AutoBidderError:
            raise
        except Exception as e:
            logger.error(f"Error deleting strategy {strategy_id}: {e}")
            raise AutoBidderError(f"Failed to delete strategy: {e}")

    async def set_default_strategy(
        self, strategy_id: str, user_id: str
    ) -> Strategy:
        """
        Set a strategy as default, unmarking all others.

        Args:
            strategy_id: Strategy UUID to set as default
            user_id: User UUID (for authorization)

        Returns:
            Updated Strategy object

        Raises:
            AutoBidderError: If update fails or strategy not found
        """
        try:
            # Check if strategy exists and belongs to user
            existing = await self.get_strategy(strategy_id, user_id)
            if not existing:
                raise AutoBidderError("Strategy not found")
            
            # Unmark all other defaults
            await self._unmark_other_defaults(user_id)
            
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                # Set this strategy as default
                row = await conn.fetchrow(
                    """
                    UPDATE bidding_strategies
                    SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1 AND user_id = $2
                    RETURNING *
                    """,
                    strategy_id,
                    user_id
                )
                
                if not row:
                    raise AutoBidderError("Failed to set default strategy")
                
                return self._row_to_strategy(row)
        except AutoBidderError:
            raise
        except Exception as e:
            logger.error(f"Error setting default strategy {strategy_id}: {e}")
            raise AutoBidderError(f"Failed to set default strategy: {e}")

    async def _unmark_other_defaults(self, user_id: str) -> None:
        """Unmark all default strategies for a user."""
        try:
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    UPDATE bidding_strategies
                    SET is_default = FALSE, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = $1 AND is_default = TRUE
                    """,
                    user_id
                )
        except Exception as e:
            logger.error(f"Error unmarking other defaults: {e}")
            raise AutoBidderError(f"Failed to unmark other defaults: {e}")

    async def test_strategy(
        self, strategy_id: str, user_id: str, job_description: Optional[str] = None
    ) -> TestProposal:
        """
        Test a strategy by generating a sample proposal.

        Args:
            strategy_id: Strategy UUID
            user_id: User UUID (for authorization)
            job_description: Optional sample job description

        Returns:
            TestProposal object

        Raises:
            AutoBidderError: If strategy not found or generation fails
        """
        try:
            # Check if strategy exists and belongs to user
            strategy = await self.get_strategy(strategy_id, user_id)
            if not strategy:
                raise AutoBidderError("Strategy not found")

            # TODO: Integrate with proposal generation service
            # For now, return a placeholder
            # In production, this should call the proposal generation service
            # with test_mode=True to generate a sample proposal

            sample_job_title = "Freelance Project"
            sample_job_description = (
                job_description
                or "We need a React developer to build a dashboard with real-time data visualization."
            )

            # Use AIService for real generation
            from app.services.ai_service import ai_service
            
            result = await ai_service.generate_proposal(
                user_id=UUID(user_id),
                request=ProposalGenerateRequest(
                    job_title=sample_job_title,
                    job_description=sample_job_description,
                    strategy_id=strategy_id
                )
            )

            return TestProposal(
                proposal=f"Title: {result.title}\n\n{result.description}", 
                test_mode=True
            )
        except AutoBidderError:
            raise
        except Exception as e:
            logger.error(f"Error testing strategy {strategy_id}: {e}")
            raise AutoBidderError(f"Failed to test strategy: {e}")

    def _row_to_strategy(self, row) -> Strategy:
        """Convert database row to Strategy model."""
        # Parse focus_areas from JSONB (can be string or already parsed)
        focus_areas = row.get("focus_areas", [])
        if isinstance(focus_areas, str):
            focus_areas = json.loads(focus_areas)
        
        return Strategy(
            id=str(row["id"]),
            user_id=str(row["user_id"]),
            name=row["name"],
            description=row.get("description"),
            system_prompt=row["system_prompt"],
            tone=row["tone"],
            focus_areas=focus_areas,
            temperature=Decimal(str(row["temperature"])),
            max_tokens=row["max_tokens"],
            is_default=row["is_default"],
            use_count=row.get("use_count", 0),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )


# Singleton instance
strategy_service = StrategyService()
