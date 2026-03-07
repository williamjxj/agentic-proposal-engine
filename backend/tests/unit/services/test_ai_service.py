"""
Unit tests for AIService.

Verifies service initialization and orchestration (without calling real LLM).
Uses mocks for strategy_service, vector_store, and chat_model.
"""

from __future__ import annotations

import os
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock

import pytest

# Set mock env variables before importing app
os.environ.setdefault("OPENAI_API_KEY", "sk-test-key")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/test_db")


@pytest.mark.unit
@pytest.mark.asyncio
async def test_ai_service_generate_proposal() -> None:
    """AIService generates proposal with mocked dependencies."""
    pytest.importorskip("langchain_openai")
    from app.models.ai import ProposalGenerateRequest
    from app.services.ai_service import AIService
    from app.services.strategy_service import strategy_service
    from app.services.vector_store import vector_store

    ai_service = AIService()

    # Mock dependencies to avoid DB/ChromaDB calls
    strategy_service.get_strategy = AsyncMock(
        return_value=MagicMock(
            id=uuid4(),
            name="Test Strategy",
            system_prompt="You are a helper.",
            tone="Professional",
            focus_areas=["React", "Node.js"],
        )
    )
    strategy_service.list_strategies = AsyncMock(
        return_value=[
            MagicMock(
                id=uuid4(),
                name="Default Strategy",
                system_prompt="Default prompt.",
                tone="Professional",
                focus_areas=[],
                is_default=True,
            )
        ]
    )
    vector_store.similarity_search = AsyncMock(
        return_value=[
            {"document": "Chunk 1 from portfolio", "metadata": {}},
            {"document": "Chunk 2 from portfolio", "metadata": {}},
        ]
    )

    # Mock LLM call
    ai_service.chat_model = AsyncMock()
    ai_service.chat_model.ainvoke = AsyncMock(
        return_value=MagicMock(content="Title: Amazing Proposal\n\nI can do this job perfectly.")
    )

    user_id = uuid4()
    request = ProposalGenerateRequest(
        job_title="Full Stack Developer",
        job_description="We need a full stack developer for our startup.",
        job_skills=["React", "Python"],
    )

    result = await ai_service.generate_proposal(user_id, request)

    assert result.title == "Amazing Proposal"
    assert "I can do this job" in result.description
    assert result.ai_model is not None
    assert result.strategy_id is not None
