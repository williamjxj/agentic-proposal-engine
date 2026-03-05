
import asyncio
import json
import httpx
from uuid import uuid4

async def test_update_focus_areas():
    base_url = "http://localhost:8000"
    
    # We need a token. I'll mock one or use one if I can.
    # Since I don't have a real token easily, I'll test the service directly.
    
    from app.services.strategy_service import strategy_service
    from app.models.strategy import StrategyUpdate
    from app.core.database import get_db_pool
    
    # Get a user and a strategy
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT id, user_id FROM bidding_strategies LIMIT 1")
        if not row:
            print("No strategies found to test.")
            return
        
        strategy_id = str(row['id'])
        user_id = str(row['user_id'])
        
    print(f"Testing update for strategy {strategy_id} and user {user_id}")
    
    focus_areas = ["Agentic AI", "RAG Pipelines", "Full-Stack Architecture"]
    update_data = StrategyUpdate(focus_areas=focus_areas)
    
    updated = await strategy_service.update_strategy(strategy_id, user_id, update_data)
    
    print(f"Updated focus_areas: {updated.focus_areas}")
    
    if updated.focus_areas == focus_areas:
        print("✅ Focus areas updated correctly using service.")
    else:
        print("❌ Focus areas NOT updated correctly.")

if __name__ == "__main__":
    asyncio.run(test_update_focus_areas())
