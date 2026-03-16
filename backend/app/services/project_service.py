"""
Project Service

CRUD and query operations for projects table (formerly jobs).
Uses asyncpg for database access.
Per specs/005-refactor-pg-database/data-model.md
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.core.database import get_db_pool
from app.models.job import JobRecord

logger = logging.getLogger(__name__)


def _split_search_terms(search: str) -> List[str]:
    """Split search text into comma/whitespace-separated terms."""
    return [term for term in search.replace(",", " ").split() if term]


def _parse_budget_value(value: Any) -> Optional[float]:
    """Parse budget string (e.g. '$21 - $21', '$100') or number to float for DB."""
    if value is None:
        return None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    if isinstance(value, str):
        import re
        nums = re.findall(r"[\d,.]+", value.replace(",", ""))
        if nums:
            try:
                return float(nums[0].replace(",", ""))
            except (ValueError, TypeError):
                pass
    return None


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


async def upsert_projects(records: List[JobRecord], etl_source: str = "hf_loader") -> tuple[int, int]:
    """
    Upsert projects by fingerprint_hash. Returns (inserted_count, updated_count).
    """
    pool = await get_db_pool()
    inserted = 0
    updated = 0

    for rec in records:
        platform = rec.platform
        if platform not in (
            "upwork", "freelancer", "linkedin", "toptal", "guru",
            "remoteok", "remotive", "huggingface_dataset", "other", "manual"
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
                INSERT INTO projects (
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
                _parse_budget_value(rec.budget_min),
                _parse_budget_value(rec.budget_max),
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


# Backward-compatible alias
upsert_jobs = upsert_projects


async def list_projects(
    limit: int = 50,
    offset: int = 0,
    search: Optional[str] = None,
    platform: Optional[str] = None,
    category: Optional[str] = None,
    status_filter: Optional[str] = None,
    applied: Optional[bool] = None,
    user_id: Optional[str] = None,
    sort_by: str = "date",
    dataset_id: Optional[str] = None,
) -> tuple[List[Dict[str, Any]], int]:
    """
    List projects with filters and pagination.
    Returns (projects, total_count).
    If user_id and status_filter/applied are set, joins user_project_status.
    """
    pool = await get_db_pool()
    conditions: List[str] = ["1=1"]
    params: List[Any] = []
    idx = 1

    if search:
        keywords = _split_search_terms(search)
        if keywords:
            or_parts = []
            for kw in keywords:
                params.append(f"%{kw}%")
                # Match title/description/company/platform/category or any skill.
                or_parts.append(
                    f"(p.title ILIKE ${idx} OR p.description ILIKE ${idx} OR "
                    f"p.employer_name ILIKE ${idx} OR p.platform::text ILIKE ${idx} OR "
                    f"p.category::text ILIKE ${idx} OR "
                    f"EXISTS (SELECT 1 FROM unnest(COALESCE(p.skills_required, ARRAY[]::text[])) AS s WHERE s ILIKE ${idx}))"
                )
                idx += 1
            conditions.append("(" + " OR ".join(or_parts) + ")")

    if platform and platform != "all":
        params.append(platform)
        conditions.append(f"p.platform::text = ${idx}")
        idx += 1

    # Dataset/source filter: HF id → etl_source; freelancer/manual → platform
    if dataset_id and str(dataset_id).strip():
        did = str(dataset_id).strip()
        if did == "freelancer":
            conditions.append("p.platform::text = 'freelancer'")
        elif did == "manual":
            conditions.append("p.platform::text = 'manual'")
        else:
            params.append(did)
            conditions.append(f"p.etl_source = ${idx}")
            idx += 1

    if category:
        params.append(f"%{category}%")
        conditions.append(f"p.category::text ILIKE ${idx}")
        idx += 1

    # User status filter (reviewed, applied, won, lost, archived, new)
    user_statuses = {"reviewed", "applied", "won", "lost", "archived"}
    use_user_status_filter = (
        user_id is not None
        and status_filter
        and status_filter != "all"
        and (status_filter in user_statuses or status_filter == "new")
    )

    join_clause = ""
    user_id_param_idx = None
    if user_id is not None:
        params.append(user_id)
        user_id_param_idx = idx
        join_clause = f" LEFT JOIN user_project_status ups ON ups.project_id = p.id AND ups.user_id = ${idx}::uuid"
        idx += 1
        if use_user_status_filter:
            if status_filter == "new":
                conditions.append("ups.id IS NULL")
            else:
                params.append(status_filter)
                conditions.append(f"ups.status = ${idx}")
                idx += 1
        elif applied is not None:
            if applied:
                conditions.append("ups.status IN ('applied', 'won', 'lost')")
            else:
                conditions.append("(ups.id IS NULL OR ups.status NOT IN ('applied', 'won', 'lost'))")
    elif status_filter and status_filter != "all":
        params.append(status_filter)
        conditions.append(f"p.status::text = ${idx}")
        idx += 1

    where_clause = " AND ".join(conditions)

    order = "p.posted_at DESC NULLS LAST" if sort_by == "date" else "p.category, p.posted_at DESC NULLS LAST"
    if sort_by == "budget":
        order = "p.budget_max DESC NULLS LAST, p.budget_min DESC NULLS LAST"

    select_cols = (
        "p.id, p.platform, p.external_id, p.fingerprint_hash, p.category, p.title, p.description, "
        "p.skills_required, p.budget_min, p.budget_max, p.budget_currency, "
        "p.employer_name, p.etl_source, p.posted_at, p.status, p.test_email, p.raw_payload"
    )
    if user_id is not None:
        select_cols += ", ups.status AS user_status"

    count_sql = f"SELECT COUNT(*)::int FROM projects p{join_clause} WHERE {where_clause}"
    total = await pool.fetchval(count_sql, *params)

    params.extend([limit, offset])
    limit_idx = idx
    offset_idx = idx + 1
    list_sql = f"""
        SELECT {select_cols}
        FROM projects p{join_clause}
        WHERE {where_clause}
        ORDER BY {order}
        LIMIT ${limit_idx} OFFSET ${offset_idx}
    """
    rows = await pool.fetch(list_sql, *params)

    projects = [
        _row_to_project_dict(
            r,
            use_user_status=user_id is not None,
        )
        for r in rows
    ]
    return projects, total


# Backward-compatible alias
list_jobs = list_projects


def _row_to_project_dict(
    row: Any, use_user_status: bool = False
) -> Dict[str, Any]:
    """Convert DB row to API response shape."""
    status = "new"
    if use_user_status and row.get("user_status"):
        status = row["user_status"]
    elif row.get("status"):
        status = row["status"]

    # Extract optional metadata from raw_payload if available
    model_response = None
    budget_type = "fixed"
    raw_payload = row.get("raw_payload")
    if raw_payload:
        if isinstance(raw_payload, str):
            try:
                raw_payload = json.loads(raw_payload)
            except (json.JSONDecodeError, TypeError):
                raw_payload = None
        if isinstance(raw_payload, dict):
            model_response = raw_payload.get("model_response")
            budget_type = raw_payload.get("budget_type") or "fixed"

    d: Dict[str, Any] = {
        "id": str(row["id"]),
        "user_id": str(row["user_id"]) if row.get("user_id") else None,
        "external_id": row.get("external_id"),
        "title": row["title"],
        "description": row["description"],
        "company": row.get("employer_name"),
        "budget_min": float(row["budget_min"]) if row.get("budget_min") is not None else None,
        "budget_max": float(row["budget_max"]) if row.get("budget_max") is not None else None,
        "budget_type": budget_type,
        "url": row.get("external_url"),
        "skills": row.get("skills_required") or [],
        "budget": {
            "min": float(row["budget_min"]) if row.get("budget_min") is not None else None,
            "max": float(row["budget_max"]) if row.get("budget_max") is not None else None,
        } if (row.get("budget_min") or row.get("budget_max")) else None,
        "platform": row.get("platform", "huggingface_dataset"),
        "status": status,
        "posted_at": row.get("posted_at").isoformat() if row.get("posted_at") else None,
        "source": row.get("etl_source"),
        "created_at": row.get("created_at").isoformat() if row.get("created_at") else None,
        "updated_at": row.get("updated_at").isoformat() if row.get("updated_at") else None,
        "test_email": row.get("test_email"),
        "model_response": model_response,  # AI-generated analysis from HuggingFace dataset
    }
    return d


async def get_stats(keyword_filter: Optional[str] = None) -> Dict[str, Any]:
    """Aggregate stats for projects page. keyword_filter: comma-separated for OR match."""
    pool = await get_db_pool()

    total_data = await pool.fetchval("SELECT COUNT(*)::int FROM projects")
    total_opportunities = total_data

    if keyword_filter:
        keywords = _split_search_terms(keyword_filter)
        if keywords:
            or_parts = []
            params: List[Any] = []
            for i, kw in enumerate(keywords):
                params.append(f"%{kw}%")
                or_parts.append(
                    f"(p.title ILIKE ${i+1} OR p.description ILIKE ${i+1} OR "
                    f"p.employer_name ILIKE ${i+1} OR p.platform::text ILIKE ${i+1} OR "
                    f"p.category::text ILIKE ${i+1} OR "
                    f"EXISTS (SELECT 1 FROM unnest(COALESCE(p.skills_required, ARRAY[]::text[])) AS s WHERE s ILIKE ${i+1}))"
                )
            where_clause = "(" + " OR ".join(or_parts) + ")"
            total_opportunities = await pool.fetchval(
                f"SELECT COUNT(*)::int FROM projects p WHERE {where_clause}",
                *params,
            )
            total_opportunities = total_opportunities or 0

    total = total_opportunities  # Backward compat
    by_platform = await pool.fetch(
        "SELECT platform::text, COUNT(*)::int FROM projects GROUP BY platform"
    )
    by_platform_dict = {r["platform"]: r["count"] for r in by_platform}

    by_skill_rows = await pool.fetch(
        """
        SELECT unnest(skills_required) AS skill, COUNT(*)::int AS cnt
        FROM projects WHERE skills_required IS NOT NULL AND array_length(skills_required, 1) > 0
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
        FROM projects WHERE budget_min IS NOT NULL OR budget_max IS NOT NULL
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
        "total_data": total_data or 0,
        "total_opportunities": total_opportunities or 0,
        "total_jobs": total_opportunities or 0,  # Backward compat
        "by_platform": by_platform_dict,
        "by_skill": dict(list(by_skill.items())[:10]),
        "avg_budget": float(avg_budget) if avg_budget is not None else None,
        "top_in_demand_skill": top_skill.title() if top_skill else None,
        "data_source": "Database" if total_data else None,
    }


USER_STATUS_VALUES = frozenset({"reviewed", "applied", "won", "lost", "archived"})


async def set_user_project_status(
    user_id: str,
    project_id: str,
    status: str,
) -> bool:
    """
    Upsert or clear user_project_status for a project.
    Status must be one of: reviewed, applied, won, lost, archived.
    Use status='new' to clear (delete) the user's status row.
    Returns True on success.
    """
    if status == "new":
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                DELETE FROM user_project_status
                WHERE user_id = $1::uuid AND project_id = $2::uuid
                """,
                user_id,
                project_id,
            )
        return True

    if status not in USER_STATUS_VALUES:
        raise ValueError(f"Invalid status. Must be one of: new, {', '.join(USER_STATUS_VALUES)}")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO user_project_status (user_id, project_id, status)
            VALUES ($1::uuid, $2::uuid, $3)
            ON CONFLICT (user_id, project_id) DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
            """,
            user_id,
            project_id,
            status,
        )
    return True


# Backward-compatible alias
set_user_job_status = set_user_project_status


async def get_project_by_id(
    project_id: str,
    user_id: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Get a single project by ID. Optionally include user's status from user_project_status.
    Returns None if project not found.
    """
    pool = await get_db_pool()
    if user_id:
        row = await pool.fetchrow(
            """
            SELECT p.id, p.platform, p.external_id, p.fingerprint_hash,
                   p.category, p.title, p.description, p.skills_required,
                   p.budget_min, p.budget_max, p.budget_currency,
                   p.employer_name, p.etl_source, p.posted_at, p.status,
                   p.test_email, p.raw_payload, ups.status AS user_status
            FROM projects p
            LEFT JOIN user_project_status ups ON ups.project_id = p.id AND ups.user_id = $2::uuid
            WHERE p.id = $1::uuid
            """,
            project_id,
            user_id,
        )
    else:
        row = await pool.fetchrow(
            """
            SELECT id, platform, external_id, fingerprint_hash,
                   category, title, description, skills_required,
                   budget_min, budget_max, budget_currency,
                   employer_name, etl_source, posted_at, status, test_email, raw_payload
            FROM projects WHERE id = $1::uuid
            """,
            project_id,
        )

    if not row:
        return None

    d = _row_to_project_dict(row)
    if user_id and row.get("user_status"):
        d["status"] = row["user_status"]
    return d


# Backward-compatible alias
get_job_by_id = get_project_by_id


async def get_projects_by_fingerprints(
    fingerprint_hashes: List[str],
    user_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Get projects by fingerprint hashes (e.g. after Discover upsert).
    Returns projects in API shape, optionally with user status.
    """
    if not fingerprint_hashes:
        return []
    pool = await get_db_pool()
    if user_id:
        rows = await pool.fetch(
            """
            SELECT p.id, p.platform, p.external_id, p.fingerprint_hash,
                   p.category, p.title, p.description, p.skills_required,
                   p.budget_min, p.budget_max, p.budget_currency,
                   p.employer_name, p.etl_source, p.posted_at, p.status,
                   p.test_email, p.raw_payload, ups.status AS user_status
            FROM projects p
            LEFT JOIN user_project_status ups ON ups.project_id = p.id AND ups.user_id = $2::uuid
            WHERE p.fingerprint_hash = ANY($1::text[])
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
                   employer_name, etl_source, posted_at, status, test_email, raw_payload
            FROM projects WHERE fingerprint_hash = ANY($1::text[])
            """,
            fingerprint_hashes,
        )
    return [
        _row_to_project_dict(r, use_user_status=user_id is not None)
        for r in rows
    ]


# Backward-compatible alias
get_jobs_by_fingerprints = get_projects_by_fingerprints


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

async def create_manual_project(user_id: str, project_data: Any) -> Dict[str, Any]:
    """
    Create a project manually (for testing/mock purposes).
    """
    import hashlib

    pool = await get_db_pool()

    # Use stable fingerprint to avoid accidental duplicates from repeated submissions.
    normalized_title = (project_data.title or "").strip().lower()
    normalized_desc = (project_data.description or "").strip().lower()
    normalized_company = (project_data.company or "").strip().lower()
    fingerprint_input = f"manual|{normalized_title}|{normalized_company}|{normalized_desc}"
    fingerprint_hash = hashlib.sha256(fingerprint_input.encode()).hexdigest()
    external_id = f"manual-{fingerprint_hash[:16]}"

    platform = "manual"
    category = "other"  # Default
    raw_payload = {
        "source": "manual_upload",
        "budget_type": project_data.budget_type,
    }

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO projects (
                platform, external_id, fingerprint_hash,
                category, title, description, skills_required,
                budget_min, budget_max, budget_currency,
                employer_name, etl_source, posted_at, test_email, raw_payload
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), $13, $14)
            ON CONFLICT (fingerprint_hash) DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                skills_required = EXCLUDED.skills_required,
                budget_min = EXCLUDED.budget_min,
                budget_max = EXCLUDED.budget_max,
                employer_name = EXCLUDED.employer_name,
                test_email = EXCLUDED.test_email,
                raw_payload = EXCLUDED.raw_payload,
                updated_at = NOW()
            RETURNING *
            """,
            platform,
            external_id,
            fingerprint_hash,
            category,
            project_data.title,
            project_data.description,
            project_data.skills or [],
            _parse_budget_value(getattr(project_data, "budget_min", None)),
            _parse_budget_value(getattr(project_data, "budget_max", None)),
            "USD",
            project_data.company,
            "manual_upload",
            project_data.test_email,
            json.dumps(raw_payload),
        )
        project = _row_to_project_dict(row)
        project["user_id"] = user_id
        return project


async def delete_manual_project(project_id: str) -> bool:
    """Delete a manually added project by id. Returns True if deleted."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        deleted_id = await conn.fetchval(
            """
            DELETE FROM projects
            WHERE id = $1::uuid AND platform = 'manual'
            RETURNING id
            """,
            project_id,
        )
    return deleted_id is not None
