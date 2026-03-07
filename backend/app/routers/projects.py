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

from ..config import settings
from ..models.auth import UserResponse
from ..routers.auth import get_current_user
from ..models.project import (
    ProjectDiscoverRequest,
    ProjectDiscoverResponse,
    Project,
    ProjectFilters,
    ProjectStats,
    ProjectListResponse
)
from ..services.hf_job_source import fetch_hf_jobs, get_available_datasets
from ..services.job_service import (
    list_jobs as job_service_list_jobs,
    get_stats as job_service_get_stats,
    get_job_by_id as job_service_get_job,
    get_jobs_by_fingerprints as job_service_get_jobs_by_fingerprints,
    set_user_job_status as job_service_set_status,
    upsert_jobs as job_service_upsert_jobs,
)
from ..services.ai_service import generate_text
from ..services.keyword_service import keyword_service

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
    # FR-007: Use request keywords, or fall back to user's saved keywords
    keywords = request.keywords
    if not keywords:
        try:
            user_keywords = await keyword_service.list_keywords(
                str(current_user.id), search=None, is_active=True
            )
            keywords = [k.keyword for k in user_keywords] if user_keywords else None
        except Exception as e:
            logger.debug(f"Could not load user keywords: {e}")
            keywords = None

    logger.info(f"User {current_user.id} discovering projects with keywords: {keywords}")

    # When ETL persistence enabled: load via hf_loader (domain filter), upsert, return from DB (T027-T030)
    if settings.etl_use_persistence and USE_HF_DATASET:
        try:
            from app.etl.hf_loader import load_and_filter_hf_jobs

            dataset_id = getattr(request, "dataset_id", None) or HF_DATASET_ID
            records, _, _ = load_and_filter_hf_jobs(
                dataset_id=dataset_id,
                limit=min(request.max_results, HF_JOB_LIMIT),
                keyword_filter=keywords,
            )
            if records:
                await job_service_upsert_jobs(records, etl_source=dataset_id)
                fingerprints = [r.fingerprint_hash for r in records]
                jobs = await job_service_get_jobs_by_fingerprints(
                    fingerprints,
                    user_id=str(current_user.id),
                )
            else:
                jobs = []

            return ProjectDiscoverResponse(
                success=True,
                source="database",
                dataset_id=dataset_id,
                dataset_used=dataset_id,
                count=len(jobs),
                total=len(jobs),
                jobs=jobs,
                keywords_searched=keywords,
            )
        except Exception as e:
            logger.exception("Discover (ETL persistence) failed: %s", e)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to discover projects: {str(e)}",
            )

    if USE_HF_DATASET:
        # Fallback: load from HuggingFace without persisting (ETL_USE_PERSISTENCE=false)
        try:
            jobs = fetch_hf_jobs(
                dataset_id=HF_DATASET_ID,
                limit=min(request.max_results, HF_JOB_LIMIT),
                keyword_filter=keywords
            )
            
            logger.info(f"Loaded {len(jobs)} jobs from HuggingFace dataset")
            
            # Ensure id for frontend (use external_id)
            jobs = [{**j, "id": j.get("id") or j.get("external_id")} for j in jobs]
            
            return ProjectDiscoverResponse(
                success=True,
                source="huggingface_dataset",
                dataset_id=HF_DATASET_ID,
                dataset_used=HF_DATASET_ID,
                count=len(jobs),
                total=len(jobs),
                jobs=jobs,
                keywords_searched=keywords
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


@router.get("/list", response_model=ProjectListResponse)
async def list_projects(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    platform: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    applied: Optional[bool] = Query(None),
    sort_by: Optional[str] = Query("date"),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    List all discovered projects for the current user.
    Supports advanced filtering, multi-keyword search, and pagination.
    """
    logger.info(f"User {current_user.email} listing projects (limit={limit}, offset={offset})")

    # When ETL persistence is enabled, read from database (FR-001)
    if settings.etl_use_persistence:
        try:
            jobs, total = await job_service_list_jobs(
                limit=limit,
                offset=offset,
                search=search,
                platform=platform,
                category=category,
                status_filter=status,
                applied=applied,
                user_id=str(current_user.id),
                sort_by=sort_by or "date",
            )
            current_page = (offset // limit) + 1
            total_pages = (total + limit - 1) // limit if limit > 0 else 1
            return ProjectListResponse(
                jobs=jobs,
                total=total,
                page=current_page,
                pages=total_pages,
                limit=limit,
                source="database",
                dataset_id=HF_DATASET_ID,
            )
        except Exception as e:
            logger.error(f"Failed to list jobs from database: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    # Parse multiple keywords if present (HF fallback)
    keywords = None
    if search:
        keywords = [k.strip() for k in search.split(",") if k.strip()]

    if USE_HF_DATASET:
        try:
            # For HF dataset, we fetch a larger pool and filter/sort locally
            # since the HF streaming API doesn't support complex server-side queries
            fetch_limit = max(limit * 2, 200) 
            jobs = fetch_hf_jobs(
                dataset_id=HF_DATASET_ID,
                limit=fetch_limit,
                keyword_filter=keywords
            )
            
            # Apply filters
            if platform and platform != "all":
                jobs = [j for j in jobs if j.get("platform") == platform]
            
            if status and status != "all":
                jobs = [j for j in jobs if j.get("status") == status]
            
            if category:
                jobs = [j for j in jobs if category.lower() in (j.get("title") or "").lower()]

            if applied is not None:
                target_status = "applied" if applied else "new"
                jobs = [j for j in jobs if j.get("status") == target_status]

            # Sorting
            if sort_by == "category":
                # Use platform or first skill as category mock
                jobs.sort(key=lambda x: x.get("platform", ""))
            else:
                # Default to date (posted_at)
                jobs.sort(key=lambda x: x.get("posted_at", ""), reverse=True)
            
            total_matches = len(jobs)
            
            # Pagination
            page_jobs = jobs[offset : offset + limit]
            
            # Ensure id for frontend
            page_jobs = [{**j, "id": j.get("id") or j.get("external_id")} for j in page_jobs]
            
            current_page = (offset // limit) + 1
            total_pages = (total_matches + limit - 1) // limit if limit > 0 else 1

            return ProjectListResponse(
                jobs=page_jobs,
                total=total_matches,
                page=current_page,
                pages=total_pages,
                limit=limit,
                source="huggingface",
                dataset_id=HF_DATASET_ID
            )
        
        except Exception as e:
            logger.error(f"Failed to list jobs: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    else:
        # TODO: Implement real database query
        return ProjectListResponse(
            jobs=[],
            total=0,
            page=1,
            pages=0,
            limit=limit,
            source="database"
        )


@router.post("/chat")
async def chat_with_projects(
    query: str = Query(..., description="The user query"),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Chat with the projects dataset using AI.
    Provides insights and matches based on natural language.
    """
    logger.info(f"User {current_user.email} chatting with projects: {query}")
    
    # In HF mode, we'll fetch some sample jobs for context
    if USE_HF_DATASET:
        jobs = fetch_hf_jobs(dataset_id=HF_DATASET_ID, limit=10)
        jobs_summary = "\n".join([
            f"- {j.get('title')} ({j.get('platform')}): {j.get('description')[:100]}..."
            for j in jobs
        ])
        
        prompt = f"""
        You are an expert freelance assistant. 
        The user is asking: "{query}"
        
        Here are some currently available projects for context:
        {jobs_summary}
        
        Provide a helpful, concise response using this context. 
        If specific projects match the query, mention them.
        """
        
        try:
            response = await generate_text(prompt)
            return {"response": response}
        except Exception as e:
            logger.error(f"AI service failed: {e}")
            return {"response": "I'm having trouble analyzing the projects right now. Try a manual search!"}
    
    return {"response": "Chat functionality is still being integrated with the database."}


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

    # When ETL persistence is enabled, read from database (FR-001)
    if settings.etl_use_persistence:
        try:
            return await job_service_get_stats()
        except Exception as e:
            logger.error(f"Failed to get stats from database: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
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

            # Skills to deprioritize (ubiquitous, low signal for "in-demand")
            LOW_SIGNAL_SKILLS = {"git", "html", "css", "rest", "api"}

            for job in jobs:
                # Count by platform
                platform = job.get("platform", "unknown")
                by_platform[platform] = by_platform.get(platform, 0) + 1

                # Count by skill
                skills = job.get("skills", [])
                if isinstance(skills, list):
                    for skill in skills[:5]:
                        if skill:
                            sk = skill.lower().strip()
                            by_skill[sk] = by_skill.get(sk, 0) + 1

                # Collect budgets (HF jobs use budget_min/budget_max)
                min_b = job.get("budget_min")
                max_b = job.get("budget_max")
                budget = job.get("budget")
                if budget and isinstance(budget, dict):
                    min_b = budget.get("min")
                    max_b = budget.get("max")
                if min_b is not None and max_b is not None:
                    budgets.append((float(min_b) + float(max_b)) / 2)
                elif min_b is not None:
                    budgets.append(float(min_b))

            # Average budget
            avg_budget = sum(budgets) / len(budgets) if budgets else None

            # Sort by_skill by count (top 15 for picking best)
            by_skill_sorted = sorted(
                by_skill.items(), key=lambda x: x[1], reverse=True
            )[:15]
            by_skill = dict(by_skill_sorted[:10])

            # Top in-demand skill: prefer trending/AI skills, deprioritize low-signal
            top_in_demand = None
            for sk, cnt in by_skill_sorted:
                if sk in LOW_SIGNAL_SKILLS and len(by_skill_sorted) > 3:
                    continue
                top_in_demand = sk
                break
            if not top_in_demand and by_skill_sorted:
                top_in_demand = by_skill_sorted[0][0]

            # Data source label (HF mode = HuggingFace; avoid confusing "Platforms = 1")
            data_source = "HuggingFace" if by_platform else None

            return {
                "total_jobs": total_jobs,
                "by_platform": by_platform,
                "by_skill": by_skill,
                "avg_budget": avg_budget,
                "top_in_demand_skill": top_in_demand.title() if top_in_demand else None,
                "data_source": data_source,
            }
        except Exception as e:
            logger.error(f"Error calculating stats: {e}")
            # Return empty stats on error
            return {
                "total_jobs": 0,
                "by_platform": {},
                "by_skill": {},
                "avg_budget": None,
                "top_in_demand_skill": None,
                "data_source": None,
            }
    else:
        # TODO: Calculate from database
        return {
            "total_jobs": 0,
            "by_platform": {},
            "by_skill": {},
            "avg_budget": None,
            "top_in_demand_skill": None,
            "data_source": None,
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

    if settings.etl_use_persistence:
        job = await job_service_get_job(project_id, user_id=str(current_user.id))
        if job:
            return job
        raise HTTPException(status_code=404, detail="Project not found")

    raise HTTPException(
        status_code=404,
        detail="Project not found. Enable ETL_USE_PERSISTENCE for database lookup."
    )


@router.put("/{project_id}/status")
async def update_project_status(
    project_id: str,
    status: str = Query(..., description="new, reviewed, applied, won, lost, archived"),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Update user's job status (FR-005).
    
    Args:
        project_id: Job UUID
        status: new, reviewed, applied, won, lost, archived
        current_user: Current user from JWT token
    
    Returns:
        Updated job with new status
    """
    logger.info(f"User {current_user.email} updating project {project_id} status to {status}")

    valid_statuses = ["new", "reviewed", "applied", "won", "lost", "archived"]
    if status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )

    if not settings.etl_use_persistence:
        raise HTTPException(
            status_code=501,
            detail="Status tracking requires ETL_USE_PERSISTENCE=true"
        )

    try:
        await job_service_set_status(str(current_user.id), project_id, status)
        job = await job_service_get_job(project_id, user_id=str(current_user.id))
        if job:
            return job
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    raise HTTPException(status_code=404, detail="Project not found")


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
