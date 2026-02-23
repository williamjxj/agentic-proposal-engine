"""API router for proposals."""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.models.proposal import (
    Proposal,
    ProposalCreate,
    ProposalListResponse,
    ProposalSubmitRequest,
    ProposalUpdate,
)
from app.routers.auth import get_current_user
from app.services import proposal_service

router = APIRouter(prefix="/api/proposals", tags=["proposals"])


@router.get("", response_model=ProposalListResponse)
async def list_proposals(
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    """List proposals for the current user."""
    user_id = UUID(current_user["id"])
    proposals = await proposal_service.list_proposals(
        user_id=user_id,
        status=status,
        limit=limit,
        offset=offset,
    )
    return ProposalListResponse(proposals=proposals, total=len(proposals))


@router.get("/{proposal_id}", response_model=Proposal)
async def get_proposal(
    proposal_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """Get a single proposal by ID."""
    user_id = UUID(current_user["id"])
    proposal = await proposal_service.get_proposal(proposal_id, user_id)
    
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    return proposal


@router.post("", response_model=Proposal, status_code=201)
async def create_proposal(
    proposal_data: ProposalCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a new proposal."""
    user_id = UUID(current_user["id"])
    proposal = await proposal_service.create_proposal(user_id, proposal_data)
    return proposal


@router.post("/from-draft/{entity_type}/{entity_id}", response_model=Proposal, status_code=201)
async def submit_from_draft(
    entity_type: str,
    entity_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Convert a draft to a final proposal and delete the draft."""
    user_id = UUID(current_user["id"])
    proposal = await proposal_service.submit_from_draft(user_id, entity_type, entity_id)
    
    if not proposal:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    return proposal


@router.put("/{proposal_id}", response_model=Proposal)
async def update_proposal(
    proposal_id: UUID,
    proposal_data: ProposalUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update an existing proposal."""
    user_id = UUID(current_user["id"])
    proposal = await proposal_service.update_proposal(proposal_id, user_id, proposal_data)
    
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    return proposal


@router.delete("/{proposal_id}", status_code=204)
async def delete_proposal(
    proposal_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """Delete a proposal."""
    user_id = UUID(current_user["id"])
    success = await proposal_service.delete_proposal(proposal_id, user_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    return None
