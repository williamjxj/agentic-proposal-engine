"""
Notification Service

Sends email notifications for qualified jobs via SendGrid.
Per specs/004-improve-autonomous, docs/quick-wins-autonomous.md.
"""

import logging
from typing import Any, Dict, List

from app.config import settings

logger = logging.getLogger(__name__)

# Default sender (SendGrid requires verified sender)
DEFAULT_FROM_EMAIL = "notifications@auto-bidder.local"
DEFAULT_FROM_NAME = "Auto-Bidder"


async def notify_qualified_jobs(
    user_email: str,
    qualified_jobs: List[Dict[str, Any]],
    threshold: float = 0.80,
) -> int:
    """
    Send email notification for qualified jobs above threshold.

    Args:
        user_email: Recipient email address
        qualified_jobs: List of job dicts with qualification_score, title, id, etc.
        threshold: Minimum score to include in notification (default 0.80)

    Returns:
        Number of jobs included in the email (0 if skipped or no jobs above threshold)
    """
    if not settings.sendgrid_api_key:
        logger.info(
            "SENDGRID_API_KEY not set; skipping notification for %s",
            user_email,
        )
        return 0

    above_threshold = [
        j for j in qualified_jobs
        if (j.get("qualification_score") or 0) >= threshold
    ]
    if not above_threshold:
        logger.debug(
            "No jobs above threshold %.2f for %s; skipping notification",
            threshold,
            user_email,
        )
        return 0

    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail
    except ImportError as e:
        logger.warning(
            "SendGrid not installed; skipping notification: %s",
            e,
        )
        return 0

    subject = f"Auto-Bidder: {len(above_threshold)} high-quality job matches"
    lines = [
        f"We found {len(above_threshold)} job(s) matching your profile (score ≥ {threshold:.0%}):",
        "",
    ]
    for j in above_threshold[:10]:  # Limit to 10 in email
        title = j.get("title") or "Untitled"
        score = j.get("qualification_score", 0)
        job_id = j.get("id", "")
        lines.append(f"• {title} (match: {score:.0%})")
        if job_id:
            lines.append(f"  Job ID: {job_id}")
        lines.append("")
    if len(above_threshold) > 10:
        lines.append(f"... and {len(above_threshold) - 10} more.")
    body = "\n".join(lines)

    message = Mail(
        from_email=(DEFAULT_FROM_EMAIL, DEFAULT_FROM_NAME),
        to_emails=user_email,
        subject=subject,
        plain_text_content=body,
    )

    try:
        sg = SendGridAPIClient(settings.sendgrid_api_key)
        sg.send(message)
        logger.info(
            "Notification sent to %s for %d jobs (threshold=%.2f)",
            user_email,
            len(above_threshold),
            threshold,
        )
        return len(above_threshold)
    except Exception as e:
        logger.warning(
            "SendGrid failed for %s: %s",
            user_email,
            e,
            exc_info=True,
        )
        return 0


async def get_user_email(user_id: str) -> str | None:
    """
    Fetch user email from users table.

    Args:
        user_id: User UUID

    Returns:
        Email string or None if not found
    """
    from app.core.database import get_db_pool

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT email FROM users WHERE id = $1::uuid",
            user_id,
        )
    return row["email"] if row and row.get("email") else None


async def send_test_proposal_email(
    target_email: str,
    proposal: Any,
) -> bool:
    """
    Send a test proposal email to the target address.
    Used for manual/mock projects testing.
    """
    if not settings.sendgrid_api_key:
        logger.info(
            "SENDGRID_API_KEY not set; skipping test proposal email for %s",
            target_email,
        )
        # Mock success for dev if no key (or log the content)
        logger.info(f"TEST PROPOSAL CONTENT for {target_email}:\n{proposal.description}")
        return True

    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail
    except ImportError:
        logger.warning("SendGrid not installed; skipping test proposal email")
        return False

    subject = f"TEST PROPOSAL: {proposal.title}"
    body = f"""
New test proposal submitted via Auto-Bidder.

Project: {proposal.title}
Platform: {proposal.job_platform}
Client: {proposal.client_name}

--- PROPOSAL CONTENT ---
{proposal.description}

--- METADATA ---
Generated with AI: {proposal.generated_with_ai}
AI Model: {proposal.ai_model_used}
    """

    message = Mail(
        from_email=(DEFAULT_FROM_EMAIL, DEFAULT_FROM_NAME),
        to_emails=target_email,
        subject=subject,
        plain_text_content=body,
    )

    try:
        sg = SendGridAPIClient(settings.sendgrid_api_key)
        sg.send(message)
        logger.info("Test proposal email sent to %s", target_email)
        return True
    except Exception as e:
        logger.warning("SendGrid failed for test proposal to %s: %s", target_email, e)
        return False
