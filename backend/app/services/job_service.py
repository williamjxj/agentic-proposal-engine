"""
Job Service

CRUD and query operations for jobs table.
Uses asyncpg for database access.
Per specs/003-projects-etl-persistence/data-model.md
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.core.database import get_db_pool
from app.models.job import JobRecord

logger = logging.getLogger(__name__)


def _parse_posted_at(value: Any) -> Optional[datetime]:
    """Parse posted_at from str or datetime to datetime for asyncpg."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            return None
    return None


# Map hf_dataset to DB enum
PLATFORM_MAP = {"hf_dataset": "huggingface_dataset"}


async def upsert_jobs(records: List[JobRecord], etl_source: str = "hf_loader") -> tuple[int, int]:
    """
    Upsert jobs by fingerprint_hash. Returns (inserted_count, updated_count).
    """
    pool = await get_db_pool()
    inserted = 0
    updated = 0

    for rec in records:
        platform = PLATFORM_MAP.get(rec.platform, rec.platform)
        if platform not in (
            "upwork", "freelancer", "linkedin", "toptal", "guru",
            "remoteok", "remotive", "huggingface_dataset", "other"
        ):
            platform = "huggingface_dataset"

        category = rec.category
        if category not in (
            "ai_ml", "web_development", "fullstack_engineering",
            "devops_mlops", "cloud_infrastructure",
            "software_outsourcing", "ui_design", "other"
        ):
            category = "other"

        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO jobs (
                    platform, external_id, external_url, fingerprint_hash,
                    category, title, description, skills_required,
                    budget_min, budget_max, budget_currency,
                    employer_name, etl_source, posted_at, raw_payload
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::timestamptz, $15)
                ON CONFLICT (fingerprint_hash) DO UPDATE SET
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    skills_required = EXCLUDED.skills_required,
                    budget_min = EXCLUDED.budget_min,
                    budget_max = EXCLUDED.budget_max,
                    employer_name = EXCLUDED.employer_name,
                    external_url = EXCLUDED.external_url,
                    etl_source = EXCLUDED.etl_source,
                    posted_at = EXCLUDED.posted_at,
                    raw_payload = EXCLUDED.raw_payload,
                    updated_at = NOW()
                RETURNING id, (xmax = 0) AS inserted
                """,
                platform,
                rec.external_id,
                rec.external_url,
                rec.fingerprint_hash,
                category,
                rec.title,
                rec.description,
                rec.skills_required or [],
                rec.budget_min,
                rec.budget_max,
                rec.budget_currency,
                rec.employer_name,
                rec.etl_source or etl_source,
                _parse_posted_at(rec.posted_at),
                __import__("json").dumps(rec.raw_payload) if rec.raw_payload else None,
            )
            if row and row.get("inserted"):
                inserted += 1
            else:
                updated += 1

    return inserted, updated


async def list_jobs(
    limit: int = 50,
    offset: int = 0,
    search: Optional[str] = None,
    platform: Optional[str] = None,
    category: Optional[str] = None,
    status_filter: Optional[str] = None,
    applied: Optional[bool] = None,
    user_id: Optional[str] = None,
    sort_by: str = "date",
) -> tuple[List[Dict[str, Any]], int]:
    """
    List jobs with filters and pagination.
    Returns (jobs, total_count).
    If user_id and status_filter/applied are set, joins user_job_status.
    """
    pool = await get_db_pool()
    conditions: List[str] = ["1=1"]
    params: List[Any] = []
    idx = 1

    if search:
        keywords = [k.strip() for k in search.split(",") if k.strip()]
        if keywords:
            or_parts = []
            for kw in keywords:
                params.append(f"%{kw}%")
                or_parts.append(f"(j.title ILIKE ${idx} OR j.description ILIKE ${idx})")
                idx += 1
            conditions.append("(" + " OR ".join(or_parts) + ")")

    if platform and platform != "all":
        params.append(platform)
        conditions.append(f"j.platform = ${idx}")
        idx += 1

    if category:
        params.append(f"%{category}%")
        conditions.append(f"j.category::text ILIKE ${idx}")
        idx += 1

    # User status filter (reviewed, applied, won, lost, archived, new) vs job status (new, matched, archived, expired)
    user_statuses = {"reviewed", "applied", "won", "lost", "archived"}
    use_user_status_filter = (
        user_id is not None
        and status_filter
        and status_filter != "all"
        and (status_filter in user_statuses or status_filter == "new")
    )

    join_clause = ""
    if user_id is not None:
        params.append(user_id)
        join_clause = f" LEFT JOIN user_job_status ujs ON ujs.job_id = j.id AND ujs.user_id = ${idx}::uuid"
        idx += 1
        if use_user_status_filter:
            if status_filter == "new":
                conditions.append("ujs.id IS NULL")
            else:
                params.append(status_filter)
                conditions.append(f"ujs.status = ${idx}")
                idx += 1
        elif applied is not None:
            if applied:
                conditions.append("ujs.status IN ('applied', 'won', 'lost')")
            else:
                conditions.append("(ujs.id IS NULL OR ujs.status NOT IN ('applied', 'won', 'lost'))")
    elif status_filter and status_filter != "all":
        params.append(status_filter)
        conditions.append(f"j.status::text = ${idx}")
        idx += 1

    where_clause = " AND ".join(conditions)

    order = "j.posted_at DESC NULLS LAST" if sort_by == "date" else "j.category, j.posted_at DESC NULLS LAST"
    if sort_by == "budget":
        order = "j.budget_max DESC NULLS LAST, j.budget_min DESC NULLS LAST"

    select_cols = (
        "j.id, j.platform, j.external_id, j.fingerprint_hash, j.category, j.title, j.description, "
        "j.skills_required, j.budget_min, j.budget_max, j.budget_currency, "
        "j.employer_name, j.etl_source, j.posted_at, j.status"
    )
    if user_id is not None:
        select_cols += ", ujs.status AS user_status"

    count_sql = f"SELECT COUNT(*)::int FROM jobs j{join_clause} WHERE {where_clause}"
    total = await pool.fetchval(count_sql, *params)

    params.extend([limit, offset])
    limit_idx = idx
    offset_idx = idx + 1
    list_sql = f"""
        SELECT {select_cols}
        FROM jobs j{join_clause}
        WHERE {where_clause}
        ORDER BY {order}
        LIMIT ${limit_idx} OFFSET ${offset_idx}
    """
    rows = await pool.fetch(list_sql, *params)

    jobs = [_row_to_job_dict(r, use_user_status=user_id is not None) for r in rows]
    return jobs, total


def _row_to_job_dict(row: Any, use_user_status: bool = False) -> Dict[str, Any]:
    """Convert DB row to API response shape. When use_user_status, prefer user_status over job status."""
    status = "new"
    if use_user_status and row.get("user_status"):
        status = row["user_status"]
    elif row.get("status"):
        status = row["status"]
    return {
        "id": str(row["id"]),
        "external_id": row.get("external_id"),
        "title": row["title"],
        "description": row["description"],
        "company": row.get("employer_name"),
        "skills": row.get("skills_required") or [],
        "budget": {
            "min": float(row["budget_min"]) if row.get("budget_min") is not None else None,
            "max": float(row["budget_max"]) if row.get("budget_max") is not None else None,
        } if (row.get("budget_min") or row.get("budget_max")) else None,
        "platform": row.get("platform", "huggingface_dataset"),
        "status": status,
        "posted_at": row.get("posted_at").isoformat() if row.get("posted_at") else None,
        "source": row.get("etl_source"),
    }


async def get_stats() -> Dict[str, Any]:
    """Aggregate stats for projects page."""
    pool = await get_db_pool()

    total = await pool.fetchval("SELECT COUNT(*)::int FROM jobs")
    by_platform = await pool.fetch(
        "SELECT platform::text, COUNT(*)::int FROM jobs GROUP BY platform"
    )
    by_platform_dict = {r["platform"]: r["count"] for r in by_platform}

    by_skill_rows = await pool.fetch(
        """
        SELECT unnest(skills_required) AS skill, COUNT(*)::int AS cnt
        FROM jobs WHERE skills_required IS NOT NULL AND array_length(skills_required, 1) > 0
        GROUP BY unnest(skills_required)
        ORDER BY cnt DESC
        LIMIT 15
        """
    )
    by_skill = {}
    for r in by_skill_rows:
        sk = (r["skill"] or "").lower().strip()
        if sk:
            by_skill[sk] = r["cnt"]

    avg_budget = await pool.fetchval(
        """
        SELECT AVG((COALESCE(budget_min, 0) + COALESCE(budget_max, 0)) / 2)::float
        FROM jobs WHERE budget_min IS NOT NULL OR budget_max IS NOT NULL
        """
    )

    LOW_SIGNAL = {"git", "html", "css", "rest", "api"}
    top_skill = None
    for sk, _ in sorted(by_skill.items(), key=lambda x: -x[1]):
        if sk not in LOW_SIGNAL or len(by_skill) <= 3:
            top_skill = sk
            break
    if not top_skill and by_skill:
        top_skill = next(iter(by_skill))

    return {
        "total_jobs": total or 0,
        "by_platform": by_platform_dict,
        "by_skill": dict(list(by_skill.items())[:10]),
        "avg_budget": float(avg_budget) if avg_budget is not None else None,
        "top_in_demand_skill": top_skill.title() if top_skill else None,
        "data_source": "Database" if total else None,
    }


# User job status values (user_job_status table)
USER_STATUS_VALUES = frozenset({"reviewed", "applied", "won", "lost", "archived"})


async def set_user_job_status(
    user_id: str,
    job_id: str,
    status: str,
) -> bool:
    """
    Upsert or clear user_job_status for a job.
    Status must be one of: reviewed, applied, won, lost, archived.
    Use status='new' to clear (delete) the user's status row.
    Returns True on success.
    """
    if status == "new":
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                DELETE FROM user_job_status
                WHERE user_id = $1::uuid AND job_id = $2::uuid
                """,
                user_id,
                job_id,
            )
        return True

    if status not in USER_STATUS_VALUES:
        raise ValueError(f"Invalid status. Must be one of: new, {', '.join(USER_STATUS_VALUES)}")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO user_job_status (user_id, job_id, status)
            VALUES ($1::uuid, $2::uuid, $3)
            ON CONFLICT (user_id, job_id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
            """,
            user_id,
            job_id,
            status,
        )
    return True


async def get_job_by_id(
    job_id: str,
    user_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Get a single job by ID. Optionally include user's status from user_job_status.
    Returns None if job not found.
    """
    pool = await get_db_pool()
    if user_id:
        row = await pool.fetchrow(
            """
            SELECT j.id, j.platform, j.external_id, j.fingerprint_hash,
                   j.category, j.title, j.description, j.skills_required,
                   j.budget_min, j.budget_max, j.budget_currency,
                   j.employer_name, j.etl_source, j.posted_at, j.status,
                   ujs.status AS user_status
            FROM jobs j
            LEFT JOIN user_job_status ujs ON ujs.job_id = j.id AND ujs.user_id = $2::uuid
            WHERE j.id = $1::uuid
            """,
            job_id,
            user_id,
        )
    else:
        row = await pool.fetchrow(
            """
            SELECT id, platform, external_id, fingerprint_hash,
                   category, title, description, skills_required,
                   budget_min, budget_max, budget_currency,
                   employer_name, etl_source, posted_at, status
            FROM jobs WHERE id = $1::uuid
            """,
            job_id,
        )

    if not row:
        return None

    d = _row_to_job_dict(row)
    if user_id and row.get("user_status"):
        d["status"] = row["user_status"]
    return d


async def get_jobs_by_fingerprints(
    fingerprint_hashes: List[str],
    user_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Get jobs by fingerprint hashes (e.g. after Discover upsert).
    Returns jobs in API shape, optionally with user status.
    """
    if not fingerprint_hashes:
        return []
    pool = await get_db_pool()
    if user_id:
        rows = await pool.fetch(
            """
            SELECT j.id, j.platform, j.external_id, j.fingerprint_hash,
                   j.category, j.title, j.description, j.skills_required,
                   j.budget_min, j.budget_max, j.budget_currency,
                   j.employer_name, j.etl_source, j.posted_at, j.status,
                   ujs.status AS user_status
            FROM jobs j
            LEFT JOIN user_job_status ujs ON ujs.job_id = j.id AND ujs.user_id = $2::uuid
            WHERE j.fingerprint_hash = ANY($1::text[])
            """,
            fingerprint_hashes,
            user_id,
        )
    else:
        rows = await pool.fetch(
            """
            SELECT id, platform, external_id, fingerprint_hash,
                   category, title, description, skills_required,
                   budget_min, budget_max, budget_currency,
                   employer_name, etl_source, posted_at, status
            FROM jobs WHERE fingerprint_hash = ANY($1::text[])
            """,
            fingerprint_hashes,
        )
    return [
        _row_to_job_dict(r, use_user_status=user_id is not None)
        for r in rows
    ]


async def record_etl_run(
    source: str,
    started_at: Any,
    completed_at: Any,
    status: str,
    jobs_extracted: int = 0,
    jobs_filtered: int = 0,
    jobs_inserted: int = 0,
    jobs_updated: int = 0,
    error_message: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> int:
    """Insert etl_runs record and return id."""
    pool = await get_db_pool()
    row = await pool.fetchrow(
        """
        INSERT INTO etl_runs (
            source, started_at, completed_at, status,
            jobs_extracted, jobs_filtered, jobs_inserted, jobs_updated,
            error_message, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
        """,
        source,
        started_at,
        completed_at,
        status,
        jobs_extracted,
        jobs_filtered,
        jobs_inserted,
        jobs_updated,
        error_message,
        metadata,
    )
    return row["id"] if row else 0


async def list_etl_runs(
    source: Optional[str] = None,
    limit: int = 20,
) -> List[Dict[str, Any]]:
    """
    List ETL run history for audit/debugging.
    Returns list of runs ordered by started_at DESC.
    """
    pool = await get_db_pool()
    if source:
        rows = await pool.fetch(
            """
            SELECT id, source, started_at, completed_at, status,
                   jobs_extracted, jobs_filtered, jobs_inserted, jobs_updated,
                   error_message, metadata
            FROM etl_runs
            WHERE source = $1
            ORDER BY started_at DESC
            LIMIT $2
            """,
            source,
            limit,
        )
    else:
        rows = await pool.fetch(
            """
            SELECT id, source, started_at, completed_at, status,
                   jobs_extracted, jobs_filtered, jobs_inserted, jobs_updated,
                   error_message, metadata
            FROM etl_runs
            ORDER BY started_at DESC
            LIMIT $1
            """,
            limit,
        )
    return [
        {
            "id": r["id"],
            "source": r["source"],
            "started_at": r["started_at"].isoformat() if r.get("started_at") else None,
            "completed_at": r["completed_at"].isoformat() if r.get("completed_at") else None,
            "status": r["status"],
            "jobs_extracted": r["jobs_extracted"],
            "jobs_filtered": r["jobs_filtered"],
            "jobs_inserted": r["jobs_inserted"],
            "jobs_updated": r["jobs_updated"],
            "error_message": r.get("error_message"),
        }
        for r in rows
    ]
