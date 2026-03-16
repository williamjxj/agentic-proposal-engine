"""
Autonomous Discovery Tasks

Background jobs for autonomous job discovery per user.
Per specs/004-improve-autonomous/tasks.md Phase 3–5.
Discovery pipeline.
"""

import logging
from typing import Any, Dict, List

from app.config import settings
from app.core.database import get_db_pool
from app.services.autonomy_settings_service import (
    create_autonomous_run,
    get_autonomy_settings,
    record_autonomous_run,
)
from app.services.project_service import upsert_jobs
from app.services.keyword_service import keyword_service
from app.services.auto_proposal_service import auto_generate_proposals

logger = logging.getLogger(__name__)



async def run_autonomous_discovery_for_user(user_id: str) -> Dict[str, Any]:
    """
    Discover jobs for a single user and upsert to database.

    Fetches user's keywords, loads jobs from HuggingFace, applies domain filter,
    upserts to jobs table.

    Args:
        user_id: User UUID

    Returns:
        Dict with jobs_discovered, proposals_generated, notifications_sent

    Raises:
        Exception: Propagates from hf_loader or project_service
    """
    # Get user keywords
    keywords: List[str] = []
    try:
        user_keywords = await keyword_service.list_keywords(
            user_id, search=None, is_active=True
        )
        keywords = [k.keyword for k in user_keywords] if user_keywords else []
    except Exception as e:
        logger.warning("Could not load keywords for user %s: %s", user_id, e)

    if not keywords:
        logger.info("User %s has no active keywords; skipping discovery", user_id)
        return {"jobs_discovered": 0, "proposals_generated": 0, "notifications_sent": 0}

    # Load and filter jobs from HuggingFace
    from app.etl.hf_loader import load_and_filter_hf_jobs

    dataset_id = settings.hf_dataset_ids_list[0] if settings.hf_dataset_ids_list else "jacob-hugging-face/job-descriptions"
    limit = min(settings.hf_job_limit, 50)
    records, _, _ = load_and_filter_hf_jobs(
        dataset_id=dataset_id,
        limit=limit,
        keyword_filter=keywords,
    )

    if not records:
        logger.info("No jobs found for user %s (keywords: %s)", user_id, keywords)
        return {"jobs_discovered": 0, "proposals_generated": 0, "notifications_sent": 0}

    # Upsert to database
    inserted, updated = await upsert_jobs(records, etl_source="autonomous_discovery")
    total = inserted + updated
    logger.info(
        "User %s: discovered %d jobs (inserted=%d, updated=%d)",
        user_id,
        total,
        inserted,
        updated,
    )

    proposals_generated = 0

    # Auto-proposal generation (if enabled)
    try:
        settings_obj = await get_autonomy_settings(user_id)
        level = (settings_obj.autonomy_level or "assisted").lower()
        if level in ("discovery_only", "assisted"):
            logger.info(
                "User %s: autonomy_level=%s; skipping auto-generation",
                user_id,
                level,
            )
        elif settings_obj.auto_generate_enabled and records:
            from app.services.project_service import get_jobs_by_fingerprints
            fingerprints = [r.fingerprint_hash for r in records]
            jobs = await get_jobs_by_fingerprints(fingerprints, user_id=None)
            if jobs:
                try:
                    proposals_generated = await auto_generate_proposals(user_id, jobs)
                    if proposals_generated:
                        logger.info(
                            "User %s: auto-generated %d proposals",
                            user_id,
                            proposals_generated,
                        )
                except Exception as ae:
                    logger.warning(
                        "Auto-generation failed for user %s: %s",
                        user_id,
                        ae,
                        exc_info=True,
                    )
    except Exception as e:
        logger.warning(
            "Settings lookup failed for user %s: %s",
            user_id,
            e,
            exc_info=True,
        )

    return {
        "jobs_discovered": total,
        "proposals_generated": proposals_generated,
        "notifications_sent": 0,
    }


async def run_autonomous_discovery_job() -> None:
    """
    Run autonomous discovery for all users with auto_discovery_enabled=true.

    Queries user_profiles, invokes run_autonomous_discovery_for_user per user.
    Per-user failures are logged and do not block other users (FR-012).
    """
    if not settings.etl_use_persistence:
        logger.debug("ETL persistence disabled; skipping autonomous discovery")
        return

    pool = await get_db_pool()
    rows = await pool.fetch(
        """
        SELECT user_id FROM user_profiles
        WHERE auto_discovery_enabled = true
        """
    )

    if not rows:
        logger.debug("No users with auto_discovery_enabled; skipping")
        return

    logger.info("Auto-discovery: starting for %d users", len(rows))
    total_jobs = 0

    for row in rows:
        user_id = str(row["user_id"])
        run_id: str | None = None
        try:
            run_id = await create_autonomous_run(user_id)
            result = await run_autonomous_discovery_for_user(user_id)
            total_jobs += result.get("jobs_discovered", 0)
            await record_autonomous_run(
                user_id,
                run_id,
                jobs_discovered=result.get("jobs_discovered", 0),
                proposals_generated=result.get("proposals_generated", 0),
                notifications_sent=result.get("notifications_sent", 0),
                status="success",
            )
        except Exception as e:
            logger.exception(
                "Discovery failed for user %s: %s",
                user_id,
                e,
                exc_info=True,
            )
            if run_id:
                await record_autonomous_run(
                    user_id,
                    run_id,
                    status="failed",
                    errors=[str(e)],
                )
            # Continue with next user (FR-012)

    logger.info("Auto-discovery complete: %d jobs across %d users", total_jobs, len(rows))


async def run_autonomous_pipeline_for_user_with_recording(user_id: str) -> str:
    """
    Run autonomous pipeline for a single user with run recording (T039, T041).

    Creates autonomous_runs row at start, runs pipeline, updates on completion.
    Used by scheduled job and by POST /api/autonomous/run (when run in foreground).

    Args:
        user_id: User UUID

    Returns:
        run_id for the created run
    """
    run_id = await create_autonomous_run(user_id)
    await _run_pipeline_and_record(user_id, run_id)
    return run_id


async def run_autonomous_pipeline_and_record(user_id: str, run_id: str) -> None:
    """
    Run pipeline and record results for an existing run (T041 background task).

    Used when POST /api/autonomous/run creates run first, then runs in background.

    Args:
        user_id: User UUID
        run_id: Existing autonomous_runs row id
    """
    await _run_pipeline_and_record(user_id, run_id)


async def _run_pipeline_and_record(user_id: str, run_id: str) -> None:
    """Run discovery pipeline and record results to autonomous_runs."""
    try:
        result = await run_autonomous_discovery_for_user(user_id)
        await record_autonomous_run(
            user_id,
            run_id,
            jobs_discovered=result.get("jobs_discovered", 0),
            proposals_generated=result.get("proposals_generated", 0),
            notifications_sent=result.get("notifications_sent", 0),
            status="success",
        )
    except Exception as e:
        logger.exception("Autonomous pipeline failed for user %s: %s", user_id, e)
        await record_autonomous_run(
            user_id,
            run_id,
            status="failed",
            errors=[str(e)],
        )
