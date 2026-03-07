"""
ETL Scheduler

APScheduler setup for scheduled job ingestion.
Per docs/todos/autobidder-etl-rag-schema-spec.md Section 2.4
"""

import logging
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.config import settings

logger = logging.getLogger(__name__)

scheduler: Optional[AsyncIOScheduler] = None


async def _run_hf_ingestion_job() -> None:
    """
    Scheduled job: run HF ingestion.
    AsyncIOScheduler executes async functions in the event loop.
    """
    from app.etl.hf_loader import run_hf_ingestion

    result = await run_hf_ingestion()
    logger.info("HF ingestion completed: %s", result)


async def _run_freelancer_ingestion_job() -> None:
    """
    Scheduled job: run Freelancer ingestion (scrape + load to DB).
    Uses freelancer_scraper then freelancer_loader.
    """
    import sys
    from pathlib import Path

    # Allow importing from project root scripts
    project_root = Path(__file__).resolve().parent.parent.parent
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

    try:
        from scripts.freelancer_scraper import FreelancerScraper
    except ImportError:
        logger.warning("Freelancer scraper not found; skipping scheduled run")
        return

    from app.etl.freelancer_loader import run_freelancer_ingestion

    scraper = FreelancerScraper(headless=True)
    jobs = await scraper.scrape(keywords=["python", "fastapi", "react"], max_results=30)
    result = await run_freelancer_ingestion(jobs=jobs, etl_source="freelancer_scheduler")
    logger.info("Freelancer ingestion completed: %s", result)


def get_scheduler() -> AsyncIOScheduler:
    """Get or create the global scheduler instance."""
    global scheduler
    if scheduler is None:
        scheduler = AsyncIOScheduler()
    return scheduler


def start_scheduler() -> None:
    """
    Start the ETL scheduler.
    Only adds HF ingestion job when ETL_USE_PERSISTENCE is enabled.
    """
    if not settings.etl_use_persistence:
        logger.info("ETL persistence disabled; scheduler not started")
        return

    sched = get_scheduler()
    hours = settings.hf_etl_schedule_hours
    sched.add_job(
        _run_hf_ingestion_job,
        IntervalTrigger(hours=hours),
        id="hf_etl",
        replace_existing=True,
    )
    fl_hours = getattr(settings, "freelancer_etl_schedule_hours", 24)
    sched.add_job(
        _run_freelancer_ingestion_job,
        IntervalTrigger(hours=fl_hours),
        id="freelancer_etl",
        replace_existing=True,
    )
    sched.start()
    logger.info(
        "ETL scheduler started; HF every %s h, Freelancer every %s h",
        hours,
        fl_hours,
    )


def shutdown_scheduler() -> None:
    """Shut down the ETL scheduler."""
    global scheduler
    if scheduler and scheduler.running:
        scheduler.shutdown(wait=False)
        scheduler = None
        logger.info("ETL scheduler stopped")
