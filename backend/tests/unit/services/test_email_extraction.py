"""
Unit Tests for Email Extraction Service

Tests email extraction from job descriptions using regex and AI.
"""

import pytest
from unittest.mock import AsyncMock, patch

from app.services.email_extraction import (
    extract_email_from_text,
    extract_email_with_ai,
    get_default_recipient_email,
    EMAIL_PATTERN,
)


class TestExtractEmailFromText:
    """Test regex-based email extraction."""

    def test_extract_simple_email(self):
        """Test extracting a simple email address."""
        text = "Contact us at john@example.com for more info"
        result = extract_email_from_text(text)
        assert result == "john@example.com"

    def test_extract_email_with_dots(self):
        """Test extracting email with dots in username."""
        text = "Email: john.doe@company.com"
        result = extract_email_from_text(text)
        assert result == "john.doe@company.com"

    def test_extract_email_with_plus(self):
        """Test extracting email with plus sign."""
        text = "Contact: john+proposals@example.com"
        result = extract_email_from_text(text)
        assert result == "john+proposals@example.com"

    def test_extract_email_from_job_description(self):
        """Test extracting email from realistic job description."""
        text = """
        Senior Full-Stack Developer Needed

        We are looking for an experienced developer to join our team.

        Requirements:
        - 5+ years experience with React and Node.js
        - Strong communication skills

        Please send your resume to hiring@techcorp.io
        """
        result = extract_email_from_text(text)
        assert result == "hiring@techcorp.io"

    def test_extract_first_email_when_multiple(self):
        """Test that first email is returned when multiple exist."""
        text = "Contact hr@company.com or info@company.com"
        result = extract_email_from_text(text)
        assert result == "hr@company.com"

    def test_no_email_found(self):
        """Test when no email address exists."""
        text = "This is a job description without any email address"
        result = extract_email_from_text(text)
        assert result is None

    def test_empty_text(self):
        """Test with empty text."""
        result = extract_email_from_text("")
        assert result is None

    def test_none_text(self):
        """Test with None text."""
        result = extract_email_from_text(None)
        assert result is None

    def test_email_with_subdomain(self):
        """Test extracting email with subdomain."""
        text = "Apply at jobs@careers.bigcorp.com"
        result = extract_email_from_text(text)
        assert result == "jobs@careers.bigcorp.com"

    def test_email_with_numbers(self):
        """Test extracting email with numbers."""
        text = "Contact: support123@company456.com"
        result = extract_email_from_text(text)
        assert result == "support123@company456.com"


class TestExtractEmailWithAI:
    """Test AI-based email extraction with fallback."""

    @pytest.mark.asyncio
    async def test_regex_extraction_preferred(self):
        """Test that regex extraction is used first (faster)."""
        text = "Contact me at john@example.com"

        # Mock AI, but it shouldn't be called since regex works
        with patch('app.services.email_extraction.get_llm') as mock_llm:
            result = await extract_email_with_ai(text, "Test Job")

            # Should return email without calling AI
            assert result == "john@example.com"
            mock_llm.assert_not_called()

    @pytest.mark.asyncio
    async def test_ai_fallback_when_no_regex_match(self):
        """Test AI extraction when regex fails."""
        text = "Contact us through the portal"

        # Mock AI to return an email
        mock_llm = AsyncMock()
        mock_response = AsyncMock()
        mock_response.generations = [[AsyncMock(text="ai-extracted@company.com")]]
        mock_llm.agenerate.return_value = mock_response

        with patch('app.services.email_extraction.get_llm', return_value=mock_llm):
            result = await extract_email_with_ai(text, "Test Job")

            assert result == "ai-extracted@company.com"
            mock_llm.agenerate.assert_called_once()

    @pytest.mark.asyncio
    async def test_ai_returns_none_when_not_found(self):
        """Test when AI also can't find email."""
        text = "No email available"

        mock_llm = AsyncMock()
        mock_response = AsyncMock()
        mock_response.generations = [[AsyncMock(text="NONE")]]
        mock_llm.agenerate.return_value = mock_response

        with patch('app.services.email_extraction.get_llm', return_value=mock_llm):
            result = await extract_email_with_ai(text, "Test Job")

            assert result is None

    @pytest.mark.asyncio
    async def test_ai_extraction_handles_errors(self):
        """Test graceful error handling when AI fails."""
        text = "No email here"

        mock_llm = AsyncMock()
        mock_llm.agenerate.side_effect = Exception("API Error")

        with patch('app.services.email_extraction.get_llm', return_value=mock_llm):
            result = await extract_email_with_ai(text, "Test Job")

            assert result is None

    @pytest.mark.asyncio
    async def test_empty_job_description(self):
        """Test with empty job description."""
        result = await extract_email_with_ai("", "Test Job")
        assert result is None

    @pytest.mark.asyncio
    async def test_none_job_description(self):
        """Test with None job description."""
        result = await extract_email_with_ai(None, "Test Job")
        assert result is None


class TestGetDefaultRecipientEmail:
    """Test getting default recipient email."""

    @patch('app.services.email_extraction.settings')
    def test_returns_settings_email(self, mock_settings):
        """Test returns email from settings."""
        mock_settings.proposal_submit_email = "service@bestitconsulting.ca"
        result = get_default_recipient_email()
        assert result == "service@bestitconsulting.ca"

    @patch('app.services.email_extraction.settings')
    def test_fallback_to_default_when_none(self, mock_settings):
        """Test fallback when settings email is None."""
        mock_settings.proposal_submit_email = None
        result = get_default_recipient_email()
        assert result == "bestitconsultingca@gmail.com"


class TestEmailPattern:
    """Test email regex pattern validation."""

    def test_pattern_matches_valid_emails(self):
        """Test that EMAIL_PATTERN matches valid email formats."""
        import re

        valid_emails = [
            "simple@example.com",
            "john.doe@company.com",
            "user+tag@domain.co.uk",
            "123@numbers.com",
            "test_user@sub.domain.com",
            "a@b.co",
        ]

        for email in valid_emails:
            assert re.search(EMAIL_PATTERN, email), f"Pattern should match {email}"

    def test_pattern_rejects_invalid_emails(self):
        """Test that EMAIL_PATTERN rejects invalid formats."""
        import re

        invalid_emails = [
            "@example.com",
            "user@",
            "user@domain",
            "user domain@example.com",
            "user@domain .com",
        ]

        for email in invalid_emails:
            assert not re.fullmatch(EMAIL_PATTERN, email), f"Pattern should reject {email}"
