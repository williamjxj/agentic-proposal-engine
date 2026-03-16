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

import logging
import os
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..config import settings
from ..models.auth import UserResponse
from ..routers.auth import get_current_user
from ..models.project import (
    Project,
    ProjectCreate,
    ProjectDiscoverRequest,
    ProjectDiscoverResponse,
    ProjectListResponse
)
from ..services.hf_job_source import fetch_hf_jobs, get_available_datasets
from ..services.project_service import (
    list_projects as list_projects_svc,
    get_stats,
    get_project_by_id,
    get_projects_by_fingerprints,
    set_user_project_status,
    upsert_jobs,
)
from ..services.ai_service import generate_text
from ..services.keyword_service import keyword_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/projects", tags=["projects"])

USE_HF_DATASET = os.getenv("USE_HF_DATASET", "true").lower() == "true"


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

    # When ETL persistence enabled
    if settings.etl_use_persistence:
        dataset_id = getattr(request, "dataset_id", None) or (settings.hf_dataset_ids_list[0] if settings.hf_dataset_ids_list else None)
        # Freelancer/manual: list from DB only (no HF fetch)
        if dataset_id in ("freelancer", "manual"):
            try:
                jobs, total = await list_projects_svc(
                    limit=min(request.max_results, settings.hf_job_limit),
                    offset=0,
                    search=",".join(keywords) if keywords else None,
                    user_id=str(current_user.id),
                    dataset_id=dataset_id,
                )
                return ProjectDiscoverResponse(
                    success=True,
                    source="database",
                    dataset_id=dataset_id,
                    dataset_used=dataset_id,
                    count=len(jobs),
                    total=total,
                    jobs=jobs,
                    keywords_searched=keywords,
                )
            except Exception as e:
                logger.exception("Discover (DB list) failed: %s", e)
                raise HTTPException(status_code=500, detail=str(e))

        # HF dataset: load via hf_loader, upsert, return from DB
        if USE_HF_DATASET and dataset_id:
            try:
                from app.etl.hf_loader import load_and_filter_hf_jobs

                records, _, _ = load_and_filter_hf_jobs(
                    dataset_id=dataset_id,
                    limit=min(request.max_results, settings.hf_job_limit),
                    keyword_filter=keywords,
                )
                if records:
                    await upsert_jobs(records, etl_source=dataset_id)
                    fingerprints = [r.fingerprint_hash for r in records]
                    jobs = await get_projects_by_fingerprints(
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

        # ETL persistence but no HF dataset selected - list from DB
        jobs, total = await list_projects_svc(
            limit=min(request.max_results, settings.hf_job_limit),
            offset=0,
            search=",".join(keywords) if keywords else None,
            user_id=str(current_user.id),
            dataset_id=dataset_id,
        )
        return ProjectDiscoverResponse(
            success=True,
            source="database",
            dataset_id=dataset_id or "",
            dataset_used=dataset_id or "",
            count=len(jobs),
            total=total,
            jobs=jobs,
            keywords_searched=keywords,
        )

    if USE_HF_DATASET:
        # Fallback: load from HuggingFace without persisting (ETL_USE_PERSISTENCE=false)
        try:
            target_dataset = getattr(request, "dataset_id", None) or (settings.hf_dataset_ids_list[0] if settings.hf_dataset_ids_list else "jacob-hugging-face/job-descriptions")
            # Freelancer/manual require ETL persistence (DB)
            if target_dataset in ("freelancer", "manual"):
                return ProjectDiscoverResponse(
                    success=True,
                    source="database",
                    dataset_id=target_dataset,
                    dataset_used=target_dataset,
                    count=0,
                    total=0,
                    jobs=[],
                    keywords_searched=keywords,
                )
            jobs, _ = fetch_hf_jobs(
                dataset_id=target_dataset,
                limit=min(request.max_results, settings.hf_job_limit),
                keyword_filter=keywords
            )

            logger.info(f"Loaded {len(jobs)} jobs from HuggingFace dataset")

            # Ensure id for frontend (use external_id)
            jobs = [{**j, "id": j.get("id") or j.get("external_id")} for j in jobs]

            return ProjectDiscoverResponse(
                success=True,
                source="huggingface_dataset",
                dataset_id=target_dataset,
                dataset_used=target_dataset,
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


@router.post("/manual", response_model=Project)
async def create_manual_project(
    project_data: ProjectCreate,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Manually create a project for testing.
    """
    logger.info(f"User {current_user.id} creating manual project: {project_data.title}")
    try:
        from ..services.project_service import create_manual_project
        project = await create_manual_project(str(current_user.id), project_data)
        return project
    except Exception as e:
        logger.exception("Manual project creation failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create manual project: {str(e)}"
        )


@router.delete("/manual/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_manual_project_endpoint(
    project_id: UUID,
    current_user: UserResponse = Depends(get_current_user),
):
    """Delete a manually added project."""
    try:
        from ..services.project_service import delete_manual_project

        deleted = await delete_manual_project(str(project_id))
        if not deleted:
            raise HTTPException(status_code=404, detail="Manual project not found")
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Manual project deletion failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete manual project: {str(e)}"
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
    dataset_id: Optional[str] = Query(None),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    List all discovered projects for the current user.
    Supports advanced filtering, multi-keyword search, and pagination.
    When search is omitted, uses user's active keywords or PROJECT_FILTER_KEYWORDS (006).
    """
    logger.info(f"User {current_user.email} listing projects (limit={limit}, offset={offset})")
    target_dataset = dataset_id if dataset_id else (settings.hf_dataset_ids_list[0] if settings.hf_dataset_ids_list else None)

    # Resolve filter keywords: search param > user keywords > system fallback > None (show all)
    filter_search = search
    if not filter_search or not str(filter_search).strip():
        try:
            user_kws = await keyword_service.list_keywords(
                str(current_user.id), search=None, is_active=True
            )
            if user_kws:
                filter_search = ",".join(k.keyword for k in user_kws if k.keyword)
            elif settings.project_filter_keywords:
                filter_search = settings.project_filter_keywords
            else:
                filter_search = None
        except Exception as e:
            logger.debug(f"Could not load user keywords for filter: {e}")
            filter_search = settings.project_filter_keywords if settings.project_filter_keywords else None

    # When ETL persistence is enabled, read from database (FR-001)
    if settings.etl_use_persistence:
        try:
            jobs, total = await list_projects_svc(
                limit=limit,
                offset=offset,
                search=filter_search,
                platform=platform,
                category=category,
                status_filter=status,
                applied=applied,
                user_id=str(current_user.id),
                sort_by=sort_by or "date",
                dataset_id=dataset_id,
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
                dataset_id=target_dataset,
            )
        except Exception as e:
            logger.error(f"Failed to list jobs from database: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    # Parse keywords for HF fallback (use resolved filter_search)
    keywords = None
    if filter_search:
        keywords = [k.strip() for k in str(filter_search).split(",") if k.strip()]

    if USE_HF_DATASET:
        try:
            # Freelancer/manual are not HF datasets — load from DB only
            if target_dataset in ("freelancer", "manual"):
                jobs, total = await list_projects_svc(
                    limit=limit,
                    offset=offset,
                    search=filter_search,
                    platform=platform,
                    category=category,
                    status_filter=status,
                    applied=applied,
                    user_id=str(current_user.id),
                    sort_by=sort_by or "date",
                    dataset_id=dataset_id,
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
                    dataset_id=target_dataset,
                )

            # For HF dataset, fetch from HuggingFace then merge with DB
            fetch_limit = max(limit * 2, 200)
            jobs, _ = fetch_hf_jobs(
                dataset_id=target_dataset or settings.hf_dataset_ids_list[0],
                limit=fetch_limit,
                keyword_filter=keywords
            )

            # Merge DB-backed projects in HF fallback mode so platform searches
            # (e.g. freelancer/manual) still work against canonical projects table.
            try:
                db_jobs, _ = await list_projects_svc(
                    limit=fetch_limit,
                    offset=0,
                    search=filter_search,
                    platform=platform,
                    category=category,
                    status_filter=status,
                    applied=applied,
                    user_id=str(current_user.id),
                    sort_by=sort_by or "date",
                    dataset_id=dataset_id,
                )
                jobs.extend(db_jobs)
            except Exception as e:
                logger.debug(f"Could not merge DB projects in HF mode: {e}")

            # Deduplicate merged records by stable ID keys.
            deduped_jobs = []
            seen_keys = set()
            for j in jobs:
                key = j.get("id") or j.get("external_id") or j.get("fingerprint_hash")
                if key and key in seen_keys:
                    continue
                if key:
                    seen_keys.add(key)
                deduped_jobs.append(j)
            jobs = deduped_jobs

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
                dataset_id=target_dataset
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
        jobs, _ = fetch_hf_jobs(
            dataset_id=settings.hf_dataset_ids_list[0] if settings.hf_dataset_ids_list else "jacob-hugging-face/job-descriptions",
            limit=10
        )
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
        "current": settings.hf_dataset_ids_list[0] if settings.hf_dataset_ids_list else "jacob-hugging-face/job-descriptions",
        "mode": "huggingface" if USE_HF_DATASET else "scraper"
    }


@router.get("/stats")
async def get_project_stats(
    dataset_id: Optional[str] = Query(None),
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
            filter_keywords = []
            try:
                user_kws = await keyword_service.list_keywords(
                    str(current_user.id), search=None, is_active=True
                )
                if user_kws:
                    filter_keywords = [k.keyword for k in user_kws if k.keyword]
                elif settings.project_filter_keywords:
                    filter_keywords = [
                        k.strip()
                        for k in settings.project_filter_keywords.split(",")
                        if k.strip()
                    ]
            except Exception:
                if settings.project_filter_keywords:
                    filter_keywords = [
                        k.strip()
                        for k in settings.project_filter_keywords.split(",")
                        if k.strip()
                    ]
            stats = await get_stats(
                keyword_filter=",".join(filter_keywords) if filter_keywords else None
            )
            stats["filter_keywords"] = ", ".join(filter_keywords) if filter_keywords else "—"
            return stats
        except Exception as e:
            logger.error(f"Failed to get stats from database: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    if USE_HF_DATASET:
        # Resolve filter keywords from keywords table first (user → system fallback)
        filter_keywords: List[str] = []
        try:
            user_kws = await keyword_service.list_keywords(
                str(current_user.id), search=None, is_active=True
            )
            if user_kws:
                filter_keywords = [k.keyword for k in user_kws if k.keyword]
            elif settings.project_filter_keywords:
                filter_keywords = [
                    k.strip() for k in settings.project_filter_keywords.split(",") if k.strip()
                ]
        except Exception as e:
            logger.debug(f"Could not load user keywords for stats: {e}")
            if settings.project_filter_keywords:
                filter_keywords = [
                    k.strip() for k in settings.project_filter_keywords.split(",") if k.strip()
                ]

        try:
            target_dataset = dataset_id if dataset_id else (settings.hf_dataset_ids_list[0] if settings.hf_dataset_ids_list else "jacob-hugging-face/job-descriptions")
            # Freelancer/manual: use DB stats only (no HF fetch)
            if target_dataset in ("freelancer", "manual"):
                stats = await get_stats(
                    keyword_filter=",".join(filter_keywords) if filter_keywords else None,
                )
                stats["filter_keywords"] = ", ".join(filter_keywords) if filter_keywords else "—"
                stats["data_source"] = "Database"
                return stats
            jobs, total_scanned = fetch_hf_jobs(
                dataset_id=target_dataset,
                limit=settings.hf_job_limit,
                keyword_filter=filter_keywords if filter_keywords else None,
            )

            total_data = total_scanned  # Records scraped/looked at
            total_opportunities = len(jobs)  # Records matching keywords

            by_platform = {}
            budgets = []
            for job in jobs:
                platform = job.get("platform", "unknown")
                by_platform[platform] = by_platform.get(platform, 0) + 1
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
            avg_budget = sum(budgets) / len(budgets) if budgets else None

            filter_keywords_str = ", ".join(filter_keywords) if filter_keywords else "—"
            data_source = "HuggingFace"

            return {
                "total_data": total_data,
                "total_opportunities": total_opportunities,
                "total_jobs": total_opportunities,  # Backward compat
                "by_platform": by_platform,
                "by_skill": {},
                "avg_budget": float(avg_budget) if avg_budget is not None else None,
                "filter_keywords": filter_keywords_str,
                "data_source": data_source,
            }
        except Exception as e:
            logger.error(f"Error calculating stats: {e}")
            return {
                "total_data": 0,
                "total_opportunities": 0,
                "total_jobs": 0,
                "by_platform": {},
                "by_skill": {},
                "avg_budget": None,
                "filter_keywords": "—",
                "data_source": None,
            }
    else:
        return {
            "total_data": 0,
            "total_opportunities": 0,
            "total_jobs": 0,
            "by_platform": {},
            "by_skill": {},
            "avg_budget": None,
            "filter_keywords": "—",
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
        job = await get_project_by_id(project_id, user_id=str(current_user.id))
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
        await set_user_project_status(str(current_user.id), project_id, status)
        job = await get_project_by_id(project_id, user_id=str(current_user.id))
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
        "dataset": (settings.hf_dataset_ids_list[0] if settings.hf_dataset_ids_list else None) if USE_HF_DATASET else None
    }


