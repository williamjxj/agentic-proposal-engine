"""Service for managing proposals."""
import json
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
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
        title=row["title"],
        description=row["description"],
        budget=row["budget"],
        timeline=row["timeline"],
        skills=row["skills"],
        job_url=row["job_url"],
        job_title=row["job_title"],
        client_name=row["client_name"],
        ai_analysis=row["ai_analysis"],
        strategy_used=str(row["strategy_used"]) if row["strategy_used"] else None,
        keywords_used=row["keywords_used"],
        status=row["status"],
        submitted_at=row["submitted_at"],
        response_received_at=row["response_received_at"],
        client_response=row["client_response"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


async def list_proposals(
    user_id: UUID,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[Proposal]:
    """List proposals for a user with optional filtering."""
    db = await get_db()
    
    query = """
        SELECT * FROM proposals 
        WHERE user_id = $1
    """
    params = [user_id]
    
    if status:
        query += " AND status = $2"
        params.append(status)
    
    query += " ORDER BY created_at DESC LIMIT $" + str(len(params) + 1) + " OFFSET $" + str(len(params) + 2)
    params.extend([limit, offset])
    
    rows = await db.fetch(query, *params)
    return [_row_to_proposal(dict(row)) for row in rows]


async def get_proposal(proposal_id: UUID, user_id: UUID) -> Optional[Proposal]:
    """Get a single proposal by ID."""
    db = await get_db()
    
    row = await db.fetchrow(
        "SELECT * FROM proposals WHERE id = $1 AND user_id = $2",
        proposal_id,
        user_id,
    )
    
    if not row:
        return None
    
    return _row_to_proposal(dict(row))


async def create_proposal(
    user_id: UUID,
    proposal_data: ProposalCreate,
) -> Proposal:
    """Create a new proposal."""
    db = await get_db()
    
    row = await db.fetchrow(
        """
        INSERT INTO proposals (
            user_id, title, description, budget, timeline, skills,
            job_url, job_title, client_name, ai_analysis,
            strategy_used, keywords_used, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
        """,
        user_id,
        proposal_data.title,
        proposal_data.description,
        proposal_data.budget,
        proposal_data.timeline,
        proposal_data.skills,
        proposal_data.job_url,
        proposal_data.job_title,
        proposal_data.client_name,
        json.dumps(proposal_data.ai_analysis) if proposal_data.ai_analysis else None,
        proposal_data.strategy_used,
        proposal_data.keywords_used,
        proposal_data.status or "draft",
    )
    
    return _row_to_proposal(dict(row))


async def update_proposal(
    proposal_id: UUID,
    user_id: UUID,
    proposal_data: ProposalUpdate,
) -> Optional[Proposal]:
    """Update an existing proposal."""
    db = await get_db()
    
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
    
    if proposal_data.job_url is not None:
        update_fields.append(f"job_url = ${param_idx}")
        params.append(proposal_data.job_url)
        param_idx += 1
    
    if proposal_data.job_title is not None:
        update_fields.append(f"job_title = ${param_idx}")
        params.append(proposal_data.job_title)
        param_idx += 1
    
    if proposal_data.client_name is not None:
        update_fields.append(f"client_name = ${param_idx}")
        params.append(proposal_data.client_name)
        param_idx += 1
    
    if proposal_data.ai_analysis is not None:
        update_fields.append(f"ai_analysis = ${param_idx}")
        params.append(json.dumps(proposal_data.ai_analysis))
        param_idx += 1
    
    if proposal_data.strategy_used is not None:
        update_fields.append(f"strategy_used = ${param_idx}")
        params.append(proposal_data.strategy_used)
        param_idx += 1
    
    if proposal_data.keywords_used is not None:
        update_fields.append(f"keywords_used = ${param_idx}")
        params.append(proposal_data.keywords_used)
        param_idx += 1
    
    if proposal_data.status is not None:
        update_fields.append(f"status = ${param_idx}")
        params.append(proposal_data.status)
        param_idx += 1
    
    if proposal_data.submitted_at is not None:
        update_fields.append(f"submitted_at = ${param_idx}")
        params.append(proposal_data.submitted_at)
        param_idx += 1
    
    if proposal_data.response_received_at is not None:
        update_fields.append(f"response_received_at = ${param_idx}")
        params.append(proposal_data.response_received_at)
        param_idx += 1
    
    if proposal_data.client_response is not None:
        update_fields.append(f"client_response = ${param_idx}")
        params.append(proposal_data.client_response)
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
    db = await get_db()
    
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
    db = await get_db()
    
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
        draft_row = await db.fetchrow(
            """
            SELECT * FROM draft_work 
            WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3
            """,
            user_id,
            entity_type,
            UUID(entity_id),
        )
    
    if not draft_row:
        return None
    
    # Parse draft data
    draft_data = draft_row["draft_data"]
    if isinstance(draft_data, str):
        draft_data = json.loads(draft_data)
    
    # Create proposal from draft
    proposal = await create_proposal(
        user_id=user_id,
        proposal_data=ProposalCreate(
            title=draft_data.get("title", "Untitled Proposal"),
            description=draft_data.get("description", ""),
            budget=draft_data.get("budget"),
            timeline=draft_data.get("timeline"),
            skills=draft_data.get("skills", []),
            job_url=draft_data.get("job_url"),
            job_title=draft_data.get("job_title"),
            client_name=draft_data.get("client_name"),
            ai_analysis=draft_data.get("ai_analysis"),
            strategy_used=UUID(draft_data["strategy_used"]) if draft_data.get("strategy_used") else None,
            keywords_used=draft_data.get("keywords_used", []),
            status="submitted",
        ),
    )
    
    # Delete the draft
    await db.execute(
        "DELETE FROM draft_work WHERE id = $1",
        draft_row["id"],
    )
    
    return proposal
