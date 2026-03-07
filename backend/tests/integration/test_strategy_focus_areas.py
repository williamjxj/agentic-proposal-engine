"""
Integration test for strategy focus_areas update.

Requires database with at least one bidding_strategy.
Run with: pytest tests/integration/test_strategy_focus_areas.py -m integration
"""

from __future__ import annotations

import pytest

from app.core.database import get_db_pool
from app.models.strategy import StrategyUpdate
from app.services.strategy_service import strategy_service


@pytest.mark.integration
@pytest.mark.asyncio
async def test_update_strategy_focus_areas() -> None:
    """Strategy focus_areas can be updated via service."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT id, user_id FROM bidding_strategies LIMIT 1")
    if not row:
        pytest.skip("No bidding_strategies in database")

    strategy_id = str(row["id"])
    user_id = str(row["user_id"])

    focus_areas = ["Agentic AI", "RAG Pipelines", "Full-Stack Architecture"]
    update_data = StrategyUpdate(focus_areas=focus_areas)

    updated = await strategy_service.update_strategy(strategy_id, user_id, update_data)

    assert updated.focus_areas == focus_areas
