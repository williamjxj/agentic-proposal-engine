"""Service for managing proposals."""
import json
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.core.database import get_db_pool
from app.models.proposal import (
    Proposal,
    ProposalCreate,
    ProposalUpdate,
)


def _row_to_proposal(row: dict) -> Proposal:
    """Convert database row to Proposal model."""
    return Proposal(
        id=str(row["id"]),
        user_id=str(row["user_id"]),
        job_id=str(row["project_id"]) if row.get("project_id") else None,
        title=row["title"],
        description=row["description"],
        budget=row["budget"],
        timeline=row["timeline"],
        skills=row["skills"] if row["skills"] else [],
        job_url=row["job_url"],
        job_platform=row["job_platform"],
        client_name=row["client_name"],
        strategy_id=str(row["strategy_id"]) if row["strategy_id"] else None,
        generated_with_ai=row["generated_with_ai"],
        ai_model_used=row["ai_model_used"],
        status=row["status"],
        submitted_at=row["submitted_at"],
        response_at=row["response_at"],
        view_count=row["view_count"],
        revision_count=row["revision_count"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        source=row.get("source"),
        auto_generated_at=row.get("auto_generated_at"),
        quality_score=row.get("quality_score"),
        quality_breakdown=row.get("quality_breakdown"),
        quality_suggestions=row.get("quality_suggestions"),
    )


async def get_applied_job_ids(user_id: UUID) -> List[str]:
    """
    Return job identifiers for which the user has a draft or submitted proposal.
    Used to prevent repeat applications. Includes job_identifier, project_id, and draft_work entity_ids.
    """
    db = await get_db_pool()
    ids: list[str] = []

    # From proposals: job_identifier and project_id for draft/submitted
    rows = await db.fetch(
        """
        SELECT job_identifier, project_id FROM proposals
        WHERE user_id = $1 AND status IN ('draft', 'submitted')
        """,
        user_id,
    )
    for row in rows:
        if row.get("job_identifier"):
            ids.append(str(row["job_identifier"]))
        if row.get("project_id"):
            ids.append(str(row["project_id"]))

    # From draft_work: unsaved proposal drafts (entity_id = jobId when creating from job)
    try:
        draft_rows = await db.fetch(
            """
            SELECT entity_id FROM draft_work
            WHERE user_id = $1 AND entity_type = 'proposal' AND entity_id IS NOT NULL
            """,
            user_id,
        )
        for row in draft_rows:
            if row.get("entity_id"):
                ids.append(str(row["entity_id"]))
    except Exception:
        # draft_work table might not exist in all setups
        pass

    return list(dict.fromkeys(ids))  # dedupe, preserve order


async def list_proposals(
    user_id: UUID,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[Proposal]:
    """List proposals for a user with optional filtering."""
    db = await get_db_pool()

    query = """
        SELECT * FROM proposals
        WHERE user_id = $1
    """
    params = [user_id]

    if status:
        query += f" AND status = ${len(params) + 1}"
        params.append(status)

    query += f" ORDER BY created_at DESC LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}"
    params.extend([limit, offset])

    rows = await db.fetch(query, *params)
    return [_row_to_proposal(dict(row)) for row in rows]


async def get_proposal(proposal_id: UUID, user_id: UUID) -> Optional[Proposal]:
    """Get a single proposal by ID."""
    db = await get_db_pool()

    row = await db.fetchrow(
        "SELECT * FROM proposals WHERE id = $1 AND user_id = $2",
        proposal_id,
        user_id,
    )

    if not row:
        return None

    return _row_to_proposal(dict(row))


async def get_proposal_quality(
    proposal_id: UUID, user_id: UUID
) -> Optional[dict]:
    """
    Get quality score and suggestions for a proposal (T033).
    Returns None if proposal not found or has no quality data.
    """
    proposal = await get_proposal(proposal_id, user_id)
    if not proposal or proposal.quality_score is None:
        return None
    return {
        "overall_score": proposal.quality_score,
        "dimension_scores": proposal.quality_breakdown or {},
        "suggestions": proposal.quality_suggestions or [],
        "word_count": None,  # Not stored; could compute from description if needed
    }


async def create_proposal(
    user_id: UUID,
    proposal_data: ProposalCreate,
) -> Proposal:
    """Create a new proposal."""
    db = await get_db_pool()

    # Resolve project_id: only link if job exists in projects (avoids FK violation
    # when job_id comes from Discover results not persisted to DB)
    project_id_val = None
    job_identifier_val = None
    if proposal_data.job_id:
        job_identifier_val = str(proposal_data.job_id).strip() or None
        try:
            pid = UUID(proposal_data.job_id)
            exists = await db.fetchval(
                "SELECT 1 FROM projects WHERE id = $1",
                pid,
            )
            if exists:
                project_id_val = pid
        except (ValueError, TypeError):
            pass

    row = await db.fetchrow(
        """
        INSERT INTO proposals (
            user_id, title, description, budget, timeline, skills,
            project_id, job_identifier, job_url, job_platform, client_name, recipient_email, strategy_id,
            generated_with_ai, ai_model_used, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
        """,
        user_id,
        proposal_data.title,
        proposal_data.description,
        proposal_data.budget,
        proposal_data.timeline,
        proposal_data.skills,
        project_id_val,
        job_identifier_val,
        proposal_data.job_url,
        proposal_data.job_platform,
        proposal_data.client_name,
        proposal_data.recipient_email,
        UUID(proposal_data.strategy_id) if proposal_data.strategy_id else None,
        proposal_data.generated_with_ai,
        proposal_data.ai_model_used,
        proposal_data.status or "draft",
    )

    proposal = _row_to_proposal(dict(row))

    # When submitted, send formal HTML proposal to customer email
    if proposal_data.status == "submitted":
        try:
            from app.config import settings
            from app.services.notification_service import send_proposal_submission_email

            # Use recipient_email from proposal, or fall back to default
            recipient = proposal_data.recipient_email or settings.proposal_submit_email
            if recipient:
                await send_proposal_submission_email(recipient, proposal)
        except Exception as e:
            import logging

            logging.getLogger(__name__).warning(
                "Failed to send proposal submission email: %s", e
            )

    return proposal


async def create_auto_generated_proposal(
    user_id: UUID,
    job_id: str,
    title: str,
    description: str,
    budget: Optional[str],
    timeline: Optional[str],
    skills: List[str],
    strategy_id: Optional[str],
    ai_model_used: Optional[str],
    job_url: Optional[str] = None,
    job_platform: Optional[str] = None,
    client_name: Optional[str] = None,
    quality_score: Optional[int] = None,
    quality_breakdown: Optional[dict] = None,
    quality_suggestions: Optional[List[str]] = None,
) -> Proposal:
    """
    Create a proposal with source='auto_generated' and auto_generated_at=NOW().
    Per specs/004-improve-autonomous T026. T032: persist quality_score, quality_breakdown, quality_suggestions.
    """
    import json
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO proposals (
                user_id, project_id, title, description, budget, timeline, skills,
                job_url, job_platform, client_name, strategy_id,
                generated_with_ai, ai_model_used, status, source, auto_generated_at,
                quality_score, quality_breakdown, quality_suggestions
            )
            VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11::uuid, true, $12, 'draft', 'auto_generated', NOW(),
                $13, $14::jsonb, $15)
            RETURNING *
            """,
            user_id,
            job_id,
            title,
            description,
            budget,
            timeline,
            skills or [],
            job_url,
            job_platform,
            client_name,
            UUID(strategy_id) if strategy_id else None,
            ai_model_used,
            quality_score,
            json.dumps(quality_breakdown) if quality_breakdown else None,
            quality_suggestions,
        )
    return _row_to_proposal(dict(row))


async def update_proposal(
    proposal_id: UUID,
    user_id: UUID,
    proposal_data: ProposalUpdate,
) -> Optional[Proposal]:
    """Update an existing proposal."""
    db = await get_db_pool()

    # Build dynamic update query
    update_fields = []
    params = []
    param_idx = 1

    if proposal_data.title is not None:
        update_fields.append(f"title = ${param_idx}")
        params.append(proposal_data.title)
        param_idx += 1

    if proposal_data.description is not None:
        update_fields.append(f"description = ${param_idx}")
        params.append(proposal_data.description)
        param_idx += 1

    if proposal_data.budget is not None:
        update_fields.append(f"budget = ${param_idx}")
        params.append(proposal_data.budget)
        param_idx += 1

    if proposal_data.timeline is not None:
        update_fields.append(f"timeline = ${param_idx}")
        params.append(proposal_data.timeline)
        param_idx += 1

    if proposal_data.skills is not None:
        update_fields.append(f"skills = ${param_idx}")
        params.append(proposal_data.skills)
        param_idx += 1

    if proposal_data.job_id is not None:
        job_identifier_val = str(proposal_data.job_id).strip() or None
        update_fields.append(f"job_identifier = ${param_idx}")
        params.append(job_identifier_val)
        param_idx += 1
        try:
            pid = UUID(proposal_data.job_id)
            exists = await db.fetchval("SELECT 1 FROM projects WHERE id = $1", pid)
            if exists:
                update_fields.append(f"project_id = ${param_idx}")
                params.append(pid)
                param_idx += 1
            else:
                update_fields.append("project_id = NULL")
        except (ValueError, TypeError):
            update_fields.append("project_id = NULL")

    if proposal_data.job_url is not None:
        update_fields.append(f"job_url = ${param_idx}")
        params.append(proposal_data.job_url)
        param_idx += 1

    if proposal_data.job_platform is not None:
        update_fields.append(f"job_platform = ${param_idx}")
        params.append(proposal_data.job_platform)
        param_idx += 1

    if proposal_data.client_name is not None:
        update_fields.append(f"client_name = ${param_idx}")
        params.append(proposal_data.client_name)
        param_idx += 1

    if proposal_data.strategy_id is not None:
        update_fields.append(f"strategy_id = ${param_idx}")
        params.append(UUID(proposal_data.strategy_id) if proposal_data.strategy_id else None)
        param_idx += 1

    if proposal_data.status is not None:
        update_fields.append(f"status = ${param_idx}")
        params.append(proposal_data.status)
        param_idx += 1

    if not update_fields:
        # Nothing to update
        return await get_proposal(proposal_id, user_id)

    # Add updated_at
    update_fields.append(f"updated_at = NOW()")

    # Add WHERE clause parameters
    params.extend([proposal_id, user_id])

    query = f"""
        UPDATE proposals
        SET {', '.join(update_fields)}
        WHERE id = ${param_idx} AND user_id = ${param_idx + 1}
        RETURNING *
    """

    row = await db.fetchrow(query, *params)

    if not row:
        return None

    return _row_to_proposal(dict(row))


async def delete_proposal(proposal_id: UUID, user_id: UUID) -> bool:
    """Delete a proposal."""
    db = await get_db_pool()

    result = await db.execute(
        "DELETE FROM proposals WHERE id = $1 AND user_id = $2",
        proposal_id,
        user_id,
    )

    return result == "DELETE 1"


async def submit_from_draft(
    user_id: UUID,
    entity_type: str,
    entity_id: str,
) -> Optional[Proposal]:
    """Convert a draft to a final proposal and delete the draft."""
    db = await get_db_pool()

    # Get the draft
    if entity_id == "new":
        draft_row = await db.fetchrow(
            """
            SELECT * FROM draft_work
            WHERE user_id = $1 AND entity_type = $2 AND entity_id IS NULL
            """,
            user_id,
            entity_type,
        )
    else:
        # Check if entity_id is a valid UUID before searching
        try:
            target_id = UUID(entity_id)
            draft_row = await db.fetchrow(
                """
                SELECT * FROM draft_work
                WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3
                """,
                user_id,
                entity_type,
                target_id,
            )
        except ValueError:
            return None

    if not draft_row:
        return None

    # Parse draft data
    draft_data = draft_row["draft_data"]
    if isinstance(draft_data, str):
        draft_data = json.loads(draft_data)

    # Extract skills
    raw_skills = draft_data.get("skills", [])
    if isinstance(raw_skills, str):
        skills = [s.strip() for s in raw_skills.split(",") if s.strip()]
    else:
        skills = raw_skills if isinstance(raw_skills, list) else []

    # Create proposal from draft
    proposal = await create_proposal(
        user_id=user_id,
        proposal_data=ProposalCreate(
            title=draft_data.get("title", "Untitled Proposal"),
            description=draft_data.get("description", ""),
            budget=draft_data.get("budget"),
            timeline=draft_data.get("timeline"),
            skills=skills,
            job_url=draft_data.get("job_url") or draft_data.get("jobUrl"),
            job_platform=draft_data.get("job_platform") or draft_data.get("jobPlatform"),
            client_name=draft_data.get("client_name") or draft_data.get("jobCompany"),
            recipient_email=draft_data.get("recipient_email") or draft_data.get("recipientEmail"),
            strategy_id=draft_data.get("strategy_id") or draft_data.get("strategy_used") or draft_data.get("strategyId"),
            generated_with_ai=draft_data.get("generated_with_ai") or draft_data.get("generatedWithAi") or False,
            ai_model_used=draft_data.get("ai_model_used") or draft_data.get("aiModelUsed"),
            status="submitted",
        ),
    )

    # Delete the draft
    await db.execute(
        "DELETE FROM draft_work WHERE id = $1",
        draft_row["id"],
    )


    return proposal
