"""
Shared pytest configuration and fixtures.

Sets default env vars for tests that need them.
"""

from __future__ import annotations

import os

import pytest


@pytest.fixture(autouse=True, scope="session")
def _test_env() -> None:
    """Set minimal env vars for tests that import app before env is loaded."""
    os.environ.setdefault("OPENAI_API_KEY", "sk-test-key")
    os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/test_db")
