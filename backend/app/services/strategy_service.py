"""
Strategy Service

Service layer for bidding strategy management operations.
Handles CRUD operations for strategies using Supabase.
"""

from typing import List, Optional
from datetime import datetime
from decimal import Decimal
import logging

from app.services.supabase_client import supabase_service
from app.models.strategy import Strategy, StrategyCreate, StrategyUpdate, TestProposal
from app.core.errors import AutoBidderError

logger = logging.getLogger(__name__)


class StrategyService:
    """Service for managing bidding strategies."""

    def __init__(self) -> None:
        """Initialize strategy service with Supabase client."""
        self.supabase = supabase_service

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
            response = (
                self.supabase.client.table("bidding_strategies")
                .select("*")
                .eq("user_id", user_id)
                .order("is_default", desc=True)
                .order("created_at", desc=True)
                .execute()
            )

            strategies = []
            for row in response.data:
                strategies.append(
                    Strategy(
                        id=row["id"],
                        user_id=row["user_id"],
                        name=row["name"],
                        description=row.get("description"),
                        system_prompt=row["system_prompt"],
                        tone=row["tone"],
                        focus_areas=row.get("focus_areas", []),
                        temperature=Decimal(str(row["temperature"])),
                        max_tokens=row["max_tokens"],
                        is_default=row["is_default"],
                        use_count=row.get("use_count", 0),
                        created_at=datetime.fromisoformat(
                            row["created_at"].replace("Z", "+00:00")
                        ),
                        updated_at=datetime.fromisoformat(
                            row["updated_at"].replace("Z", "+00:00")
                        ),
                    )
                )

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
            response = (
                self.supabase.client.table("bidding_strategies")
                .select("*")
                .eq("id", strategy_id)
                .eq("user_id", user_id)
                .single()
                .execute()
            )

            if not response.data:
                return None

            row = response.data
            return Strategy(
                id=row["id"],
                user_id=row["user_id"],
                name=row["name"],
                description=row.get("description"),
                system_prompt=row["system_prompt"],
                tone=row["tone"],
                focus_areas=row.get("focus_areas", []),
                temperature=Decimal(str(row["temperature"])),
                max_tokens=row["max_tokens"],
                is_default=row["is_default"],
                use_count=row.get("use_count", 0),
                created_at=datetime.fromisoformat(
                    row["created_at"].replace("Z", "+00:00")
                ),
                updated_at=datetime.fromisoformat(
                    row["updated_at"].replace("Z", "+00:00")
                ),
            )
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
            # Check for duplicate name (case-insensitive)
            existing = (
                self.supabase.client.table("bidding_strategies")
                .select("id")
                .eq("user_id", user_id)
                .ilike("name", strategy_data.name)
                .execute()
            )

            if existing.data:
                raise AutoBidderError(
                    f"Strategy '{strategy_data.name}' already exists for this user"
                )

            # If setting as default, unmark other defaults
            if strategy_data.is_default:
                await self._unmark_other_defaults(user_id)

            # Insert new strategy
            response = (
                self.supabase.client.table("bidding_strategies")
                .insert(
                    {
                        "user_id": user_id,
                        "name": strategy_data.name,
                        "description": strategy_data.description,
                        "system_prompt": strategy_data.system_prompt,
                        "tone": strategy_data.tone,
                        "focus_areas": strategy_data.focus_areas,
                        "temperature": float(strategy_data.temperature)),
                        "max_tokens": strategy_data.max_tokens,
                        "is_default": strategy_data.is_default,
                    }
                )
                .execute()
            )

            if not response.data:
                raise AutoBidderError("Failed to create strategy")

            row = response.data[0]
            return Strategy(
                id=row["id"],
                user_id=row["user_id"],
                name=row["name"],
                description=row.get("description"),
                system_prompt=row["system_prompt"],
                tone=row["tone"],
                focus_areas=row.get("focus_areas", []),
                temperature=Decimal(str(row["temperature"])),
                max_tokens=row["max_tokens"],
                is_default=row["is_default"],
                use_count=row.get("use_count", 0),
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

            # Check for duplicate if name is being changed
            if strategy_data.name and strategy_data.name != existing.name:
                duplicate = (
                    self.supabase.client.table("bidding_strategies")
                    .select("id")
                    .eq("user_id", user_id)
                    .ilike("name", strategy_data.name)
                    .neq("id", strategy_id)
                    .execute()
                )

                if duplicate.data:
                    raise AutoBidderError(
                        f"Strategy '{strategy_data.name}' already exists for this user"
                    )

            # Build update dict (only include provided fields)
            update_data = {}
            if strategy_data.name is not None:
                update_data["name"] = strategy_data.name
            if strategy_data.description is not None:
                update_data["description"] = strategy_data.description
            if strategy_data.system_prompt is not None:
                update_data["system_prompt"] = strategy_data.system_prompt
            if strategy_data.tone is not None:
                update_data["tone"] = strategy_data.tone
            if strategy_data.focus_areas is not None:
                update_data["focus_areas"] = strategy_data.focus_areas
            if strategy_data.temperature is not None:
                update_data["temperature"] = float(str(strategy_data.temperature))
            if strategy_data.max_tokens is not None:
                update_data["max_tokens"] = strategy_data.max_tokens

            if not update_data:
                return existing

            # Update strategy
            response = (
                self.supabase.client.table("bidding_strategies")
                .update(update_data)
                .eq("id", strategy_id)
                .eq("user_id", user_id)
                .execute()
            )

            if not response.data:
                raise AutoBidderError("Failed to update strategy")

            row = response.data[0]
            return Strategy(
                id=row["id"],
                user_id=row["user_id"],
                name=row["name"],
                description=row.get("description"),
                system_prompt=row["system_prompt"],
                tone=row["tone"],
                focus_areas=row.get("focus_areas", []),
                temperature=Decimal(str(row["temperature"])),
                max_tokens=row["max_tokens"],
                is_default=row["is_default"],
                use_count=row.get("use_count", 0),
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

            # Delete strategy
            response = (
                self.supabase.client.table("bidding_strategies")
                .delete()
                .eq("id", strategy_id)
                .eq("user_id", user_id)
                .execute()
            )

            if not response.data:
                raise AutoBidderError("Failed to delete strategy")

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

            # Set this strategy as default
            response = (
                self.supabase.client.table("bidding_strategies")
                .update({"is_default": True})
                .eq("id", strategy_id)
                .eq("user_id", user_id)
                .execute()
            )

            if not response.data:
                raise AutoBidderError("Failed to set default strategy")

            row = response.data[0]
            return Strategy(
                id=row["id"],
                user_id=row["user_id"],
                name=row["name"],
                description=row.get("description"),
                system_prompt=row["system_prompt"],
                tone=row["tone"],
                focus_areas=row.get("focus_areas", []),
                temperature=Decimal(str(row["temperature"])),
                max_tokens=row["max_tokens"],
                is_default=row["is_default"],
                use_count=row.get("use_count", 0),
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
            logger.error(f"Error setting default strategy {strategy_id}: {e}")
            raise AutoBidderError(f"Failed to set default strategy: {e}")

    async def _unmark_other_defaults(self, user_id: str) -> None:
        """Unmark all default strategies for a user."""
        try:
            self.supabase.client.table("bidding_strategies").update(
                {"is_default": False}
            ).eq("user_id", user_id).eq("is_default", True).execute()
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

            sample_job = (
                job_description
                or "We need a React developer to build a dashboard with real-time data visualization."
            )

            # Placeholder proposal text
            proposal_text = f"""
            [Sample Proposal Generated with Strategy: {strategy.name}]
            
            Based on the job description: {sample_job}
            
            This is a test proposal generated using the "{strategy.name}" strategy.
            In production, this would be generated by the AI proposal service.
            
            Strategy Configuration:
            - Tone: {strategy.tone}
            - Temperature: {strategy.temperature}
            - Max Tokens: {strategy.max_tokens}
            - Focus Areas: {strategy.focus_areas.join(', ') if strategy.focus_areas else 'None'}
            """

            return TestProposal(proposal=proposal_text.strip(), test_mode=True)
        except AutoBidderError:
            raise
        except Exception as e:
            logger.error(f"Error testing strategy {strategy_id}: {e}")
            raise AutoBidderError(f"Failed to test strategy: {e}")


# Singleton instance
strategy_service = StrategyService()
