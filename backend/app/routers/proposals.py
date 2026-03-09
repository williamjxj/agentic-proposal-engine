"""API router for proposals."""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from app.core.errors import RateLimitError
from app.models.proposal import (
    Proposal,
    ProposalCreate,
    ProposalListResponse,
    ProposalQuality,
    ProposalSubmitRequest,
    ProposalUpdate,
)
from app.routers.auth import get_current_user
from app.services import proposal_service
from app.services.ai_service import ai_service
from app.models.auth import UserResponse
from app.models.ai import ProposalGenerateRequest, GeneratedProposal

router = APIRouter(prefix="/api/proposals", tags=["proposals"])


@router.get("/applied-ids")
async def get_applied_job_ids(
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Return job identifiers for which the user has a draft or submitted proposal.
    Used by Projects page to disable repeat 'Generate Proposal' on already-applied jobs.
    """
    ids = await proposal_service.get_applied_job_ids(current_user.id)
    return {"job_ids": ids}


@router.get("", response_model=ProposalListResponse)
async def list_proposals(
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: UserResponse = Depends(get_current_user),
):
    """List proposals for the current user."""
    user_id = current_user.id
    proposals = await proposal_service.list_proposals(
        user_id=user_id,
        status=status,
        limit=limit,
        offset=offset,
    )
    return ProposalListResponse(proposals=proposals, total=len(proposals))


@router.get("/{proposal_id}/quality", response_model=ProposalQuality)
async def get_proposal_quality(
    proposal_id: UUID,
    current_user: UserResponse = Depends(get_current_user),
):
    """Get quality score and suggestions for a proposal (T033, FR-009)."""
    quality = await proposal_service.get_proposal_quality(proposal_id, current_user.id)
    if not quality:
        raise HTTPException(status_code=404, detail="Quality data not available for this proposal")
    return ProposalQuality(**quality)


@router.get("/{proposal_id}", response_model=Proposal)
async def get_proposal(
    proposal_id: UUID,
    current_user: UserResponse = Depends(get_current_user),
):
    """Get a single proposal by ID."""
    user_id = current_user.id
    proposal = await proposal_service.get_proposal(proposal_id, user_id)
    
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    return proposal


@router.post("", response_model=Proposal, status_code=201)
async def create_proposal(
    proposal_data: ProposalCreate,
    current_user: UserResponse = Depends(get_current_user),
):
    """Create a new proposal."""
    user_id = current_user.id
    proposal = await proposal_service.create_proposal(user_id, proposal_data)
    return proposal


@router.post("/generate-from-job", response_model=GeneratedProposal)
async def generate_proposal_from_job(
    request: ProposalGenerateRequest,
    response: Response,
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Generate an AI-powered proposal using RAG and a selected strategy.
    
    This is the core agentic workflow. Returns 429 if another generation is in progress (FR-010).
    """
    try:
        user_id = current_user.id
        return await ai_service.generate_proposal(user_id, request)
    except RateLimitError as e:
        retry_after = 30
        if e.details and isinstance(e.details, dict):
            retry_after = e.details.get("retry_after_seconds", 30)
        response.headers["Retry-After"] = str(retry_after)
        raise HTTPException(status_code=429, detail=e.message)


@router.post("/from-draft/{entity_type}/{entity_id}", response_model=Proposal, status_code=201)
async def submit_from_draft(
    entity_type: str,
    entity_id: str,
    current_user: UserResponse = Depends(get_current_user),
):
    """Convert a draft to a final proposal and delete the draft."""
    user_id = current_user.id
    proposal = await proposal_service.submit_from_draft(user_id, entity_type, entity_id)
    
    if not proposal:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    return proposal


@router.put("/{proposal_id}", response_model=Proposal)
async def update_proposal(
    proposal_id: UUID,
    proposal_data: ProposalUpdate,
    current_user: UserResponse = Depends(get_current_user),
):
    """Update an existing proposal."""
    user_id = current_user.id
    proposal = await proposal_service.update_proposal(proposal_id, user_id, proposal_data)
    
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    return proposal


@router.delete("/{proposal_id}", status_code=204)
async def delete_proposal(
    proposal_id: UUID,
    current_user: UserResponse = Depends(get_current_user),
):
    """Delete a proposal."""
    user_id = current_user.id
    success = await proposal_service.delete_proposal(proposal_id, user_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    return None
