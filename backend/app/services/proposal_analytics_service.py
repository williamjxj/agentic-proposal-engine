"""
Proposal Analytics Service

Aggregates proposal data for charts: trends, acceptance rates, revenue, platform performance.
"""

from datetime import datetime, timedelta
from typing import Any
from uuid import UUID

from app.core.database import get_db_pool


def _parse_time_range(time_range: str) -> timedelta:
    """Parse time range string to timedelta."""
    if time_range == "24h":
        return timedelta(hours=24)
    if time_range == "7d":
        return timedelta(days=7)
    if time_range == "30d":
        return timedelta(days=30)
    if time_range == "90d":
        return timedelta(days=90)
    return timedelta(days=7)


async def get_proposal_analytics(user_id: UUID, time_range: str = "7d") -> dict[str, Any]:
    """
    Get aggregated proposal analytics for charts.

    Returns:
        - proposal_trends: [{ date, count, submitted }] - proposals created per day
        - acceptance_over_time: [{ date, accepted, total, rate }] - weekly acceptance
        - revenue_over_time: [{ period, revenue }] - sum of budget for accepted
        - platform_performance: [{ platform, count, accepted, rate }]
    """
    pool = await get_db_pool()
    since = datetime.utcnow() - _parse_time_range(time_range)
    user_id_val = user_id if isinstance(user_id, UUID) else UUID(str(user_id))

    async with pool.acquire() as conn:
        # Proposal trends: count by date (created_at)
        trends_rows = await conn.fetch(
            """
            SELECT DATE(created_at AT TIME ZONE 'UTC') as date,
                   COUNT(*) as count,
                   COUNT(*) FILTER (WHERE status = 'submitted' OR status = 'accepted') as submitted
            FROM proposals
            WHERE user_id = $1 AND created_at >= $2
            GROUP BY DATE(created_at AT TIME ZONE 'UTC')
            ORDER BY date
            """,
            user_id_val,
            since,
        )
        proposal_trends = [
            {
                "date": str(row["date"]),
                "count": row["count"],
                "submitted": row["submitted"],
            }
            for row in trends_rows
        ]

        # Acceptance rate over time: group by week
        acceptance_rows = await conn.fetch(
            """
            WITH weekly AS (
                SELECT DATE_TRUNC('week', created_at AT TIME ZONE 'UTC') as week,
                       COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
                       COUNT(*) FILTER (WHERE status IN ('submitted', 'accepted', 'rejected')) as total
                FROM proposals
                WHERE user_id = $1 AND created_at >= $2
                GROUP BY DATE_TRUNC('week', created_at AT TIME ZONE 'UTC')
            )
            SELECT week::date as date, accepted, total,
                   CASE WHEN total > 0 THEN ROUND(100.0 * accepted / total, 1) ELSE 0 END as rate
            FROM weekly
            ORDER BY date
            """,
            user_id_val,
            since,
        )
        acceptance_over_time = [
            {
                "date": str(row["date"]),
                "accepted": row["accepted"],
                "total": row["total"],
                "rate": float(row["rate"]) if row["rate"] else 0,
            }
            for row in acceptance_rows
        ]

        # Revenue over time: sum budget for accepted proposals by month
        revenue_over_time = []
        try:
            revenue_rows = await conn.fetch(
                """
                SELECT DATE_TRUNC('month', created_at AT TIME ZONE 'UTC')::date as period,
                       COALESCE(SUM(budget::numeric), 0) as revenue
                FROM proposals
                WHERE user_id = $1 AND created_at >= $2 AND status = 'accepted'
                GROUP BY DATE_TRUNC('month', created_at AT TIME ZONE 'UTC')
                ORDER BY period
                """,
                user_id_val,
                since,
            )
            revenue_over_time = [
                {"period": str(row["period"]), "revenue": float(row["revenue"])}
                for row in revenue_rows
            ]
        except Exception:
            pass

        # Platform performance
        platform_rows = await conn.fetch(
            """
            SELECT COALESCE(job_platform, 'Unknown') as platform,
                   COUNT(*) as count,
                   COUNT(*) FILTER (WHERE status = 'accepted') as accepted
            FROM proposals
            WHERE user_id = $1 AND created_at >= $2
            GROUP BY job_platform
            ORDER BY count DESC
            """,
            user_id_val,
            since,
        )
        platform_performance = [
            {
                "platform": row["platform"],
                "count": row["count"],
                "accepted": row["accepted"],
                "rate": round(100.0 * row["accepted"] / row["count"], 1) if row["count"] > 0 else 0,
            }
            for row in platform_rows
        ]

    return {
        "proposal_trends": proposal_trends,
        "acceptance_over_time": acceptance_over_time,
        "revenue_over_time": revenue_over_time,
        "platform_performance": platform_performance,
    }
