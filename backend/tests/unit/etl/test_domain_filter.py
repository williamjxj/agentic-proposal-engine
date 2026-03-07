"""
Unit tests for domain_filter.passes_domain_filter.

Per specs/003-projects-etl-persistence/tasks.md T034.
"""

from __future__ import annotations

import pytest

from app.etl.domain_filter import ALLOWED_DOMAINS, passes_domain_filter


@pytest.mark.unit
def test_passes_domain_filter_ai_ml() -> None:
    """Text with AI/ML keywords should pass and return ai_ml category."""
    text = "We need a machine learning engineer with experience in transformers."
    passes, category = passes_domain_filter(text)
    assert passes is True
    assert category == "ai_ml"


@pytest.mark.unit
def test_passes_domain_filter_web_development() -> None:
    """Text with web dev keywords should pass and return web_development category."""
    text = "Looking for React and Next.js developer for full-stack role."
    passes, category = passes_domain_filter(text)
    assert passes is True
    assert category == "web_development"


@pytest.mark.unit
def test_passes_domain_filter_devops() -> None:
    """Text with DevOps keywords should pass and return devops_mlops category."""
    text = "Kubernetes and Docker experience required for CI/CD pipeline."
    passes, category = passes_domain_filter(text)
    assert passes is True
    assert category == "devops_mlops"


@pytest.mark.unit
def test_passes_domain_filter_cloud() -> None:
    """Text with cloud keywords should pass and return cloud_infrastructure category."""
    text = "AWS and GCP cloud migration project, serverless Lambda."
    passes, category = passes_domain_filter(text)
    assert passes is True
    assert category == "cloud_infrastructure"


@pytest.mark.unit
def test_passes_domain_filter_outsourcing() -> None:
    """Text with outsourcing keywords should pass and return software_outsourcing category."""
    text = "Freelance contract for remote consultant on fixed price basis."
    passes, category = passes_domain_filter(text)
    assert passes is True
    assert category == "software_outsourcing"


@pytest.mark.unit
def test_passes_domain_filter_ui_design() -> None:
    """Text with UI/UX keywords should pass and return ui_design category."""
    text = "Figma and UX design for product design system."
    passes, category = passes_domain_filter(text)
    assert passes is True
    assert category == "ui_design"


@pytest.mark.unit
def test_passes_domain_filter_rejects_irrelevant() -> None:
    """Text without allowed domain keywords should fail."""
    text = "Need plumber for bathroom renovation. Must have driver's license."
    passes, category = passes_domain_filter(text)
    assert passes is False
    assert category == ""


@pytest.mark.unit
def test_passes_domain_filter_empty_input() -> None:
    """Empty input should fail."""
    assert passes_domain_filter("") == (False, "")


@pytest.mark.unit
def test_passes_domain_filter_case_insensitive() -> None:
    """Matching should be case insensitive."""
    text = "MACHINE LEARNING and DEEP LEARNING"
    passes, category = passes_domain_filter(text)
    assert passes is True
    assert category == "ai_ml"


@pytest.mark.unit
def test_allowed_domains_structure() -> None:
    """ALLOWED_DOMAINS should have expected categories."""
    expected = {
        "ai_ml",
        "web_development",
        "fullstack_engineering",
        "devops_mlops",
        "cloud_infrastructure",
        "software_outsourcing",
        "ui_design",
    }
    assert set(ALLOWED_DOMAINS.keys()) == expected
