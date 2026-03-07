"""
ETL Module - Job ingestion from HuggingFace and other sources.

Provides domain filter, HF loader, job service integration, and scheduled ingestion.
"""

from .domain_filter import passes_domain_filter, ALLOWED_DOMAINS

__all__ = ["passes_domain_filter", "ALLOWED_DOMAINS"]
