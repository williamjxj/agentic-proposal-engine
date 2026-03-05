"""
Test script for AIService.
Verifies service initialization and orchestration (without calling real LLM).
"""

import asyncio
import os
from uuid import uuid4
from unittest.mock import MagicMock, AsyncMock

# Set mock env variables for testing
os.environ["OPENAI_API_KEY"] = "sk-test-key"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@localhost:5432/test_db"

from app.services.ai_service import AIService
from app.models.ai import ProposalGenerateRequest

async def test_ai_service():
    print("Initializing AIService...")
    ai_service = AIService()
    
    # Mock dependencies to avoid DB/ChromaDB calls
    from app.services.strategy_service import strategy_service
    from app.services.vector_store import vector_store
    
    strategy_service.get_strategy = AsyncMock(return_value=MagicMock(
        id=uuid4(),
        name="Test Strategy",
        system_prompt="You are a helper.",
        tone="Professional",
        focus_areas=["React", "Node.js"]
    ))
    
    strategy_service.list_strategies = AsyncMock(return_value=[MagicMock(
        id=uuid4(),
        name="Default Strategy",
        system_prompt="Default prompt.",
        tone="Professional",
        focus_areas=[],
        is_default=True
    )])
    
    vector_store.similarity_search = AsyncMock(return_value=[
        {"document": "Chunk 1 from portfolio", "metadata": {}},
        {"document": "Chunk 2 from portfolio", "metadata": {}}
    ])
    
    # Mock LLM call
    ai_service.chat_model = AsyncMock()
    ai_service.chat_model.ainvoke = AsyncMock(return_value=MagicMock(
        content="Title: Amazing Proposal\n\nI can do this job perfectly."
    ))
    
    print("Testing generate_proposal...")
    user_id = uuid4()
    request = ProposalGenerateRequest(
        job_title="Full Stack Developer",
        job_description="We need a full stack developer for our startup.",
        job_skills=["React", "Python"]
    )
    
    result = await ai_service.generate_proposal(user_id, request)
    
    print(f"Generated Title: {result.title}")
    # print(f"Generated Content: {result.description}")
    print(f"Used Model: {result.ai_model}")
    print(f"Strategy ID: {result.strategy_id}")
    
    assert result.title == "Amazing Proposal"
    assert "I can do this job" in result.description
    print("\n✅ AIService Test Passed!")

if __name__ == "__main__":
    asyncio.run(test_ai_service())
