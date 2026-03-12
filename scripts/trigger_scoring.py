#!/usr/bin/env python3
"""
Quick script to trigger project scoring for all users.
Run this to populate the qualification scores.
"""
import asyncio
import os
import sys
from pathlib import Path

# Set database URL before importing app modules
os.environ['DATABASE_URL'] = 'postgresql://postgres:postgres@localhost:5432/auto_bidder_dev'

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.core.database import get_db_pool
from app.tasks.scoring_tasks import score_all_projects_for_user


async def main():
    """Trigger scoring for all projects for the first user."""
    print("Starting project scoring...")

    # Get user ID
    user_id = "55caaa93-5f80-475d-bdba-a1a59f81786b"

    # Get database pool (initializes connection)
    pool = await get_db_pool()

    print(f"Scoring projects for user {user_id}...")
    result = await score_all_projects_for_user(
        user_id=user_id,
        force_recalculate=True,
        limit=100
    )

    if result['success']:
        print(f"✅ Successfully scored {result['projects_scored']} projects!")
    else:
        print(f"❌ Error: {result.get('error')}")
        return

    # Show some sample results
    async with pool.acquire() as conn:
        results = await conn.fetch("""
            SELECT p.title, upq.qualification_score
            FROM user_project_qualifications upq
            JOIN projects p ON p.id = upq.project_id
            WHERE upq.user_id = $1
            ORDER BY upq.qualification_score DESC
            LIMIT 10
        """, user_id)

