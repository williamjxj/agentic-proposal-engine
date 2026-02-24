"""
Projects API Router

Handles project/job discovery from various sources:
- HuggingFace datasets (mock data for development)
- Web scraping (future implementation)
- Manual uploads

Routes:
- POST /api/projects/discover - Discover new projects
- GET  /api/projects/list - List all projects
- GET  /api/projects/{project_id} - Get single project
- PUT  /api/projects/{project_id}/status - Update project status
- GET  /api/projects/stats - Get project statistics
"""

import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
import logging

from ..models.auth import UserResponse
from ..routers.auth import get_current_user
from ..models.project import (
    ProjectDiscoverRequest,
    ProjectDiscoverResponse,
    Project,
    ProjectFilters,
    ProjectStats
)
from ..services.hf_job_source import fetch_hf_jobs, get_available_datasets

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/projects", tags=["projects"])

# Configuration from environment variables
USE_HF_DATASET = os.getenv("USE_HF_DATASET", "true").lower() == "true"
HF_DATASET_ID = os.getenv("HF_DATASET_ID", "jacob-hugging-face/job-descriptions")
HF_JOB_LIMIT = int(os.getenv("HF_JOB_LIMIT", "100"))


@router.post("/discover", response_model=ProjectDiscoverResponse)
async def discover_projects(
    request: ProjectDiscoverRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Discover new projects/jobs from configured data source.
    
    In development mode (USE_HF_DATASET=true), loads jobs from HuggingFace datasets.
    In production mode (USE_HF_DATASET=false), uses web scraping (not yet implemented).
    
    Args:
        request: Discovery request with keywords and filters
        current_user: Current user from JWT token
    
    Returns:
        ProjectDiscoverResponse with discovered jobs
    
    Example:
        POST /api/projects/discover
        {
            "keywords": ["python", "fastapi"],
            "platforms": ["upwork"],
            "max_results": 20
        }
    """
    logger.info(f"User {user_id} discovering projects with keywords: {request.keywords}")
    
    if USE_HF_DATASET:
        # Development mode: load from HuggingFace
        try:
            jobs = fetch_hf_jobs(
                dataset_id=HF_DATASET_ID,
                limit=min(request.max_results, HF_JOB_LIMIT),
                keyword_filter=request.keywords if request.keywords else None
            )
            
            logger.info(f"Loaded {len(jobs)} jobs from HuggingFace dataset")
            
            # TODO: Store jobs in database for persistence
            # For now, return directly
            
            return ProjectDiscoverResponse(
                success=True,
                source="huggingface_dataset",
                dataset_id=HF_DATASET_ID,
                count=len(jobs),
                jobs=jobs
            )
        
        except Exception as e:
            logger.error(f"Failed to load jobs from HuggingFace: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to discover projects: {str(e)}"
            )
    
    else:
        # Production mode: web scraping (not implemented yet)
        raise HTTPException(
            status_code=501,
            detail="Real web scraping not implemented yet. Set USE_HF_DATASET=true to use mock data."
        )


@router.get("/list")
async def list_projects(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    platform: Optional[str] = None,
    status: Optional[str] = None,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    List all discovered projects for the current user.
    
    Args:
        limit: Maximum number of projects to return
        offset: Number of projects to skip
        platform: Filter by platform (optional)
        status: Filter by status (optional)
        current_user: Current user from JWT token
    
    Returns:
        List of projects
    
    Example:
        GET /api/projects/list?limit=20&platform=upwork&status=new
    """
    logger.info(f"User {current_user.email} listing projects (limit={limit}, offset={offset})")
    
    if USE_HF_DATASET:
        # In development mode, load fresh from HuggingFace
        # TODO: In production, query from database
        try:
            jobs = fetch_hf_jobs(
                dataset_id=HF_DATASET_ID,
                limit=limit
            )
            
            # Apply filters
            if platform and platform != "all":
                jobs = [j for j in jobs if j.get("platform") == platform]
            
            if status and status != "all":
                jobs = [j for j in jobs if j.get("status") == status]
            
            return {
                "jobs": jobs,
                "total": len(jobs),
                "source": "huggingface",
                "dataset_id": HF_DATASET_ID
            }
        
        except Exception as e:
            logger.error(f"Failed to list jobs: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    else:
        # TODO: Query from database
        return {
            "jobs": [],
            "total": 0,
            "source": "database"
        }


@router.get("/datasets")
async def list_available_datasets():
    """
    Get list of available HuggingFace datasets for job data.
    
    Returns:
        List of dataset information
    
    Example:
        GET /api/projects/datasets
    """
    datasets = get_available_datasets()
    
    return {
        "datasets": datasets,
        "current": HF_DATASET_ID,
        "mode": "huggingface" if USE_HF_DATASET else "scraper"
    }


@router.get("/stats")
async def get_project_stats(
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Get statistics about discovered projects.
    
    Args:
        current_user: Current user from JWT token
    
    Returns:
        Project statistics
    
    Example:
        GET /api/projects/stats
    """
    logger.info(f"User {current_user.email} getting project stats")
    
    if USE_HF_DATASET:
        # Calculate from HuggingFace dataset
        try:
            jobs = fetch_hf_jobs(
                dataset_id=HF_DATASET_ID,
                limit=HF_JOB_LIMIT
            )
            
            # Calculate statistics
            total_jobs = len(jobs)
            by_platform = {}
            by_skill = {}
            budgets = []
            
            for job in jobs:
                # Count by platform
                platform = job.get("platform", "unknown")
                by_platform[platform] = by_platform.get(platform, 0) + 1
                
                # Count by skill
                skills = job.get("skills", [])
                if isinstance(skills, list):
                    for skill in skills[:5]:  # Top 5 skills per job
                        if skill:
                            by_skill[skill] = by_skill.get(skill, 0) + 1
                
                # Collect budgets
                budget = job.get("budget")
                if budget and isinstance(budget, dict):
                    min_budget = budget.get("min")
                    max_budget = budget.get("max")
                    if min_budget and max_budget:
                        budgets.append((min_budget + max_budget) / 2)
            
            # Calculate average budget
            avg_budget = sum(budgets) / len(budgets) if budgets else None
            
            # Sort by_skill by count (top 10)
            by_skill = dict(sorted(by_skill.items(), key=lambda x: x[1], reverse=True)[:10])
            
            return {
                "total_jobs": total_jobs,
                "by_platform": by_platform,
                "by_skill": by_skill,
                "avg_budget": avg_budget
            }
        except Exception as e:
            logger.error(f"Error calculating stats: {e}")
            # Return empty stats on error
            return {
                "total_jobs": 0,
                "by_platform": {},
                "by_skill": {},
                "avg_budget": None
            }
    else:
        # TODO: Calculate from database
        return {
            "total_jobs": 0,
            "by_platform": {},
            "by_skill": {},
            "avg_budget": None
        }


@router.get("/{project_id}")
async def get_project(
    project_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Get details of a specific project.
    
    Args:
        project_id: Project UUID or external ID
        current_user: Current user from JWT token
    
    Returns:
        Project details
    
    Example:
        GET /api/projects/abc123
    """
    logger.info(f"User {current_user.email} getting project {project_id}")
    
    # TODO: Query from database
    raise HTTPException(
        status_code=404,
        detail="Project not found. Database storage not implemented yet."
    )


@router.put("/{project_id}/status")
async def update_project_status(
    project_id: str,
    status: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Update project status.
    
    Args:
        project_id: Project UUID
        status: New status (new, reviewed, applied, rejected)
        current_user: Current user from JWT token
    
    Returns:
        Updated project
    
    Example:
        PUT /api/projects/abc123/status?status=reviewed
    """
    logger.info(f"User {current_user.email} updating project {project_id} status to {status}")
    
    # Validate status
    valid_statuses = ["new", "reviewed", "applied", "rejected"]
    if status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    # TODO: Update in database
    raise HTTPException(
        status_code=404,
        detail="Project not found. Database storage not implemented yet."
    )


@router.get("/health")
async def health_check():
    """
    Health check endpoint for projects service.
    
    Returns:
        Service health status
    """
    return {
        "status": "healthy",
        "service": "projects",
        "mode": "huggingface" if USE_HF_DATASET else "scraper",
        "dataset": HF_DATASET_ID if USE_HF_DATASET else None
    }
