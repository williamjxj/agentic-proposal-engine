# Web Scraping Status

**Last updated:** March 2026  
**Status:** 🔴 **Not implemented** – use HuggingFace datasets for job discovery

---

## Summary

Real web scraping (Upwork, Freelancer, etc.) is **planned but not implemented**. The platform uses **HuggingFace datasets** for job discovery instead.

| Approach | Status | Use for |
|----------|--------|---------|
| **HuggingFace datasets** | ✅ Implemented | Development, MVP, testing |
| **Web scraping** | ❌ Not implemented | Future production (optional) |

---

## Current: HuggingFace Job Discovery

- **UI:** Projects → Discover Jobs
- **Backend:** `backend/app/services/hf_job_source.py`
- **Config:** `USE_HF_DATASET=true`, `HF_DATASET_ID` in `.env`
- **Docs:** [huggingface-job-discovery.md](huggingface-job-discovery.md)

---

## Future: Web Scraping (Optional)

**What exists (preparation only):**
- DB schema: `scraping_jobs`, `platform_credentials` in migrations
- Error class: `ScrapingError` in `backend/app/core/errors.py`
- Dependencies: playwright, beautifulsoup4, lxml in requirements.txt

**What's missing:**
- No `scraper_service.py`
- No scraping API routes
- No Upwork/Freelancer scrapers
- No background workers

**Recommendation:** Continue using HuggingFace for now. Add real scraping only if production requires live platform job feeds.
