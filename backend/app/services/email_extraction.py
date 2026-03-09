"""
Email Extraction Service

Extracts email addresses from job descriptions using AI and regex patterns.
"""

import re
import logging
from typing import Optional

from langchain_openai import ChatOpenAI
from app.config import settings

logger = logging.getLogger(__name__)

# Common email regex pattern
EMAIL_PATTERN = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'


def extract_email_from_text(text: str) -> Optional[str]:
    """
    Extract email address from text using regex.

    Args:
        text: Text to search for email addresses

    Returns:
        First email address found, or None
    """
    if not text:
        return None

    emails = re.findall(EMAIL_PATTERN, text)
    if emails:
        # Return first email found
        return emails[0]

    return None


async def extract_email_with_ai(job_description: str, job_title: str = "") -> Optional[str]:
    """
    Use AI to extract email address from job description.
    Falls back to regex if AI fails.

    Args:
        job_description: Full job description text
        job_title: Optional job title for context

    Returns:
        Extracted email address or None
    """
    if not job_description:
        return None

    # First try regex (faster and more reliable)
    regex_email = extract_email_from_text(job_description)
    if regex_email:
        logger.info(f"Email extracted via regex: {regex_email}")
        return regex_email

    # If no email found via regex, try AI extraction
    try:
        llm = ChatOpenAI(
            model="gpt-3.5-turbo",
            temperature=0,
            api_key=settings.openai_api_key
        )

        prompt = f"""Extract the contact email address from this job posting.
Job Title: {job_title or 'N/A'}

Job Description:
{job_description[:1000]}

Instructions:
- Look for contact emails, application emails, or HR emails
- Return ONLY the email address, nothing else
- If no email found, return "NONE"

Email Address:"""

        response = await llm.agenerate([prompt])
        extracted = response.generations[0][0].text.strip()

        # Validate the extracted email
        if extracted and extracted != "NONE" and re.match(EMAIL_PATTERN, extracted):
            logger.info(f"Email extracted via AI: {extracted}")
            return extracted

    except Exception as e:
        logger.warning(f"AI email extraction failed: {e}")

    return None


def get_default_recipient_email() -> str:
    """
    Get the default recipient email from settings.

    Returns:
        Default email address for proposals
    """
    return settings.proposal_submit_email or "bestitconsultingca@gmail.com"
