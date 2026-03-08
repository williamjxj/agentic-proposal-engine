"""
Auto-Proposal Service

Auto-generates proposal drafts for high-confidence job matches.
Per specs/004-improve-autonomous, docs/quick-wins-autonomous.md.
"""

import logging
from typing import Any, Dict, List
from uuid import UUID

from app.models.ai import ProposalGenerateRequest
from app.services.ai_service import ai_service
from app.services.proposal_service import create_auto_generated_proposal
from app.services.settings_service import settings_service

logger = logging.getLogger(__name__)


async def auto_generate_proposals(
    user_id: str,
    qualified_jobs: List[Dict[str, Any]],
    threshold: float = 0.85,
) -> int:
    """
    Generate proposal drafts for jobs above threshold.

    Uses ai_service.generate_proposal per job, persists with source='auto_generated'.
    Uses user's default bidding_strategy from settings (T028).

    Args:
        user_id: User UUID
        qualified_jobs: List of job dicts with qualification_score, title, description, skills, id, etc.
        threshold: Minimum score to auto-generate (default 0.85)

    Returns:
        Number of proposals created
    """
    above_threshold = [
        j for j in qualified_jobs
        if (j.get("qualification_score") or 0) >= threshold
    ]
    if not above_threshold:
        logger.debug(
            "No jobs above auto_generate threshold %.2f for user %s",
            threshold,
            user_id,
        )
        return 0

    if not ai_service.chat_model:
        logger.warning(
            "LLM not configured; skipping auto-generation for user %s",
            user_id,
        )
        return 0

    # Get default strategy from user settings (T028)
    strategy_id: str | None = None
    try:
        settings_obj = await settings_service.get_settings(user_id)
        strategy_id = settings_obj.preferences.default_strategy_id if settings_obj.preferences else None
    except Exception as e:
        logger.debug("Could not load default strategy for %s: %s", user_id, e)

    created = 0
    user_uuid = UUID(user_id)

    for job in above_threshold:
        try:
            request = ProposalGenerateRequest(
                job_id=job.get("id"),
                job_title=job.get("title") or "Untitled",
                job_description=job.get("description") or "",
                job_company=job.get("company"),
                job_skills=job.get("skills") or [],
                job_model_response=job.get("model_response"),
                strategy_id=strategy_id,
            )
            result = await ai_service.generate_proposal(user_uuid, request)

            quality_score: int | None = None
            if result.quality_score is not None:
                quality_score = int(round(result.quality_score))

            await create_auto_generated_proposal(
                user_id=user_uuid,
                job_id=job.get("id", ""),
                title=result.title,
                description=result.description,
                budget=result.budget,
                timeline=result.timeline,
                skills=result.skills,
                strategy_id=strategy_id,
                ai_model_used=result.ai_model,
                job_url=None,
                job_platform=job.get("platform"),
                client_name=job.get("company"),
                quality_score=quality_score,
                quality_breakdown=result.quality_breakdown,
                quality_suggestions=result.quality_suggestions,
            )
            created += 1
            logger.info(
                "Auto-generated proposal for user %s, job %s",
                user_id,
                job.get("id"),
            )
        except Exception as e:
            logger.warning(
                "Auto-generation failed for user %s, job %s: %s",
                user_id,
                job.get("id"),
                e,
                exc_info=True,
            )
            # Continue with next job

    return created
