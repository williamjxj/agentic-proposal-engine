"""
Background Tasks for Project Scoring

Async tasks that calculate match scores for projects.
Triggered by:
- Scheduled jobs (nightly scoring)
- User keyword updates
- Manual trigger via API
- New project imports
"""

import asyncio
import logging

from app.core.database import get_db_pool
from app.services.project_scoring_service import project_scoring_service

logger = logging.getLogger(__name__)


async def score_all_projects_for_user(
    user_id: str, force_recalculate: bool = False, limit: int = 100
) -> dict:
    """
    Score all unscored (or all if forced) projects for a user.

    Args:
        user_id: User UUID
        force_recalculate: Recalculate all scores, ignore cache
        limit: Maximum projects to score per batch

    Returns:
        Dict with success status and count
    """
    logger.info(
        f"Starting project scoring for user {user_id} "
        f"(force={force_recalculate}, limit={limit})"
    )

    try:
        results = await project_scoring_service.score_projects_batch(
            user_id=user_id,
            project_ids=None,  # Score all
            force_recalculate=force_recalculate,
            limit=limit
        )

        logger.info(f"Scored {len(results)} projects for user {user_id}")

        return {
            "success": True,
            "user_id": user_id,
            "projects_scored": len(results),
            "force_recalculate": force_recalculate
        }

    except Exception as e:
        logger.error(f"Failed to score projects for user {user_id}: {e}")
        return {
            "success": False,
            "user_id": user_id,
            "error": str(e)
        }


async def score_projects_for_all_active_users(limit_per_user: int = 50) -> dict:
    """
    Score projects for all users who have active keywords.
    Used by nightly scheduled task.

    Args:
        limit_per_user: Max projects to score per user

    Returns:
        Dict with summary stats
    """
    logger.info("Starting batch scoring for all active users")

    pool = await get_db_pool()

    # Get users who have active keywords
    users = await pool.fetch(
        """
        SELECT DISTINCT user_id
        FROM keywords
        WHERE is_active = TRUE
        """
    )

    logger.info(f"Found {len(users)} users with active keywords")

    results = {
        "total_users": len(users),
        "successful": 0,
        "failed": 0,
        "total_projects_scored": 0
    }

    for user_row in users:
        user_id = str(user_row['user_id'])

        try:
            result = await score_all_projects_for_user(
                user_id=user_id,
                force_recalculate=False,  # Only score new/stale projects
                limit=limit_per_user
            )

            if result.get('success'):
                results['successful'] += 1
                results['total_projects_scored'] += result.get('projects_scored', 0)
            else:
                results['failed'] += 1

        except Exception as e:
            logger.error(f"Failed to score for user {user_id}: {e}")
            results['failed'] += 1

        # Small delay to avoid overwhelming the system
        await asyncio.sleep(0.5)

    logger.info(
        f"Batch scoring complete: {results['successful']}/{results['total_users']} users, "
        f"{results['total_projects_scored']} projects scored"
    )

    return results


async def score_specific_projects(
    user_id: str, project_ids: list[str], force_recalculate: bool = True
) -> dict:
    """
    Score specific projects for a user.
    Used when user views a project or after importing new projects.

    Args:
        user_id: User UUID
        project_ids: List of project UUIDs to score
        force_recalculate: Whether to recalculate existing scores

    Returns:
        Dict with results
    """
    logger.info(f"Scoring {len(project_ids)} specific projects for user {user_id}")

    try:
        results = await project_scoring_service.score_projects_batch(
            user_id=user_id,
            project_ids=project_ids,
            force_recalculate=force_recalculate,
            limit=len(project_ids)
        )

        return {
            "success": True,
            "user_id": user_id,
            "projects_scored": len(results),
            "scores": {pid: score for pid, (score, _) in results.items()}
        }

    except Exception as e:
        logger.error(f"Failed to score specific projects: {e}")
        return {
            "success": False,
            "error": str(e)
        }


async def rescore_after_keyword_change(user_id: str) -> dict:
    """
    Trigger rescoring when user updates their keywords.
    Recalculates scores for all projects.

    Args:
        user_id: User UUID

    Returns:
        Dict with task status
    """
    logger.info(f"User {user_id} changed keywords, triggering rescore")

    # Queue background task
    asyncio.create_task(
        score_all_projects_for_user(
            user_id=user_id,
            force_recalculate=True,  # Recalculate all
            limit=200  # Higher limit for user-triggered rescoring
        )
    )

    return {
        "success": True,
        "message": "Rescoring triggered in background",
        "user_id": user_id
    }
