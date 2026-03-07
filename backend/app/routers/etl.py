"""
ETL API Router

Endpoints for ETL run history and manual ingestion trigger.
Per specs/003-projects-etl-persistence/contracts/projects-api.yaml (FR-009)
"""

import asyncio
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse

from .auth import get_current_user
from ..models.auth import UserResponse
from ..services.job_service import list_etl_runs
from ..etl.hf_loader import run_hf_ingestion

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/etl", tags=["etl"])


@router.get("/runs")
async def get_etl_runs(
    source: Optional[str] = Query(None, description="Filter by ETL source"),
    limit: int = Query(20, ge=1, le=100),
    current_user: UserResponse = Depends(get_current_user),
) -> JSONResponse:
    """
    List ETL run history for audit and debugging (FR-009).
    """
    runs = await list_etl_runs(source=source, limit=limit)
    return JSONResponse(content={"runs": runs})


@router.post("/trigger")
async def trigger_etl(
    body: Optional[dict] = None,
    current_user: UserResponse = Depends(get_current_user),
) -> JSONResponse:
    """
    Trigger manual ETL ingestion (returns 202, runs async).
    Body: {"source": "hf_loader" | "freelancer_loader"} (default: hf_loader)
    """
    source = (body or {}).get("source", "hf_loader")
    asyncio.create_task(_run_ingestion_background(source))
    return JSONResponse(
        status_code=202,
        content={"message": "ETL ingestion started", "source": source},
    )


async def _run_ingestion_background(source: str = "hf_loader") -> None:
    """Background task for manual ETL trigger."""
    try:
        if source == "freelancer_loader":
            from ..etl.freelancer_loader import run_freelancer_ingestion
            result = await run_freelancer_ingestion(etl_source="etl_trigger")
        else:
            result = await run_hf_ingestion()
        logger.info("Manual ETL trigger (%s) completed: %s", source, result)
    except Exception as e:
        logger.exception("Manual ETL trigger (%s) failed: %s", source, e)
