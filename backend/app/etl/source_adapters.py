"""
Source Adapters for Multi-Dataset Job Ingestion

Maps raw records from different sources (HF datasets, Freelancer, manual upload)
to canonical JobRecord schema. Registry-based; no if/elif chains.
"""

import hashlib
import logging
import random
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.models.job import JobRecord

logger = logging.getLogger(__name__)

# Common tech terms for skill extraction from unstructured text
_COMMON_TECH_TERMS = [
    "python", "machine learning", "deep learning", "tensorflow", "pytorch",
    "langchain", "llm", "nlp", "transformers", "openai", "generative ai",
    "javascript", "typescript", "react", "node", "fastapi", "django", "flask",
    "vue", "angular", "sql", "postgresql", "mongodb", "redis",
    "docker", "kubernetes", "aws", "azure", "gcp",
]

FIELD_ALIASES = {
    "title": ["title", "job_title", "position_title", "Job Title", "role", "designation"],
    "company": ["company", "employer", "company_name", "Organization", "client"],
    "description": ["description", "job_description", "Job Description"],
    "requirements": ["requirements", "job_requirements", "Requirements"],
    "skills": ["skills", "job_skills", "Skills", "tech_stack", "technologies"],
    "budget_min": ["budget_min", "salary_year_avg", "Salary", "salary", "min_salary"],
    "budget_max": ["budget_max", "salary_year_max", "max_salary"],
    "url": ["url", "job_posting_url", "application_url", "link"],
    "posted_at": ["posted_at", "date_posted", "listed_at", "created_at", "original_listed_time"],
}


def _extract_skills(value: Any) -> List[str]:
    """Extract skills from text, list, or comma-separated string."""
    if not value:
        return []
    if isinstance(value, list):
        return [str(s).strip() for s in value if s][:50]
    if isinstance(value, str):
        for sep in [",", "|", ";", "/"]:
            if sep in value:
                return [s.strip() for s in value.split(sep) if s.strip()][:50]
        if len(value) < 50:
            return [value.strip()] if value.strip() else []
        text_lower = value.lower()
        return list(dict.fromkeys(t for t in _COMMON_TECH_TERMS if t in text_lower))
    return []


def _probe_field(record: Dict, aliases: List[str]) -> Any:
    """Probe record for first matching alias."""
    for key in aliases:
        if key in record and record[key] is not None:
            return record[key]
    return None


def _generate_recent_date() -> str:
    """Generate a recent posted date (last 30 days)."""
    days_ago = random.randint(0, 30)
    return (datetime.now() - timedelta(days=days_ago)).isoformat()


def _fingerprint(platform: str, external_id: str) -> str:
    """SHA256(platform + external_id) for deduplication."""
    return hashlib.sha256(f"{platform}:{external_id}".encode()).hexdigest()


def _normalize_category(category: str) -> str:
    """Map domain filter category to job_category enum."""
    valid = {
        "ai_ml", "web_development", "fullstack_engineering",
        "devops_mlops", "cloud_infrastructure",
        "software_outsourcing", "ui_design",
    }
    return category if category in valid else "other"


class BaseAdapter:
    """Base adapter: raw dict → canonical job dict (not JobRecord)."""

    platform: str = "huggingface_dataset"
    source_id: str = ""

    def to_canonical(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Override in subclasses. Returns dict with title, company, description, etc."""
        raise NotImplementedError


class JacobHFAdapter(BaseAdapter):
    """jacob-hugging-face/job-descriptions."""

    source_id = "jacob-hugging-face/job-descriptions"

    def to_canonical(self, record: Dict[str, Any]) -> Dict[str, Any]:
        title = record.get("position_title") or record.get("job_title") or "Unknown Title"
        desc = record.get("job_description", "")
        ext_id = hashlib.md5((desc[:80] or title).encode()).hexdigest()
        skills = _extract_skills(record.get("job_requirements", ""))
        if not skills:
            skills = _extract_skills(desc[:500])
        return {
            "id": hashlib.md5(f"{title}{desc[:100]}".encode()).hexdigest(),
            "external_id": ext_id,
            "platform": "huggingface_dataset",
            "title": title,
            "company": record.get("company_name", "Unknown Company"),
            "description": desc,
            "requirements": record.get("job_requirements", ""),
            "model_response": record.get("model_response", ""),
            "skills": skills,
            "budget_min": None,
            "budget_max": None,
            "budget_type": "fixed",
            "url": "",
            "posted_at": _generate_recent_date(),
            "source": self.source_id,
            "status": "new",
            "client_rating": round(random.uniform(4.0, 5.0), 1),
        }


def _build_data_jobs_description(record: Dict[str, Any]) -> str:
    """Build description from lukebarousse/data_jobs fields (no job_description column)."""
    parts = []
    title = record.get("job_title") or record.get("job_title_short")
    if title:
        parts.append(f"**Title:** {title}")
    loc = record.get("job_location")
    if loc:
        parts.append(f"**Location:** {loc}")
    via = record.get("job_via")
    if via:
        parts.append(f"**Via:** {via}")
    schedule = record.get("job_schedule_type")
    if schedule:
        parts.append(f"**Schedule:** {schedule}")
    remote = record.get("job_work_from_home")
    if remote is True:
        parts.append("**Remote:** Yes")
    country = record.get("job_country")
    if country:
        parts.append(f"**Country:** {country}")
    salary_y = record.get("salary_year_avg")
    salary_h = record.get("salary_hour_avg")
    if salary_y is not None and str(salary_y).lower() not in ("nan", "none", ""):
        try:
            parts.append(f"**Salary (year):** ${float(salary_y):,.0f}")
        except (ValueError, TypeError):
            parts.append(f"**Salary (year):** {salary_y}")
    if salary_h is not None and str(salary_h).lower() not in ("nan", "none", ""):
        try:
            parts.append(f"**Salary (hour):** ${float(salary_h):.1f}")
        except (ValueError, TypeError):
            parts.append(f"**Salary (hour):** {salary_h}")
    skills_raw = record.get("job_skills")
    if skills_raw:
        if isinstance(skills_raw, list):
            skills_str = ", ".join(str(s) for s in skills_raw[:30])
        elif isinstance(skills_raw, str):
            skills_str = skills_raw[:500]
        else:
            skills_str = str(skills_raw)[:500]
        if skills_str.strip():
            parts.append(f"**Skills:** {skills_str}")
    type_skills = record.get("job_type_skills")
    if type_skills:
        if isinstance(type_skills, dict):
            for k, v in list(type_skills.items())[:5]:
                if v:
                    vals = v if isinstance(v, list) else [v]
                    v_str = ", ".join(str(x) for x in vals[:15])
                    if v_str.strip():
                        parts.append(f"**{k}:** {v_str}")
        elif isinstance(type_skills, str):
            try:
                import json
                d = json.loads(type_skills)
                if isinstance(d, dict):
                    for k, v in list(d.items())[:5]:
                        if v:
                            vals = v if isinstance(v, list) else [v]
                            v_str = ", ".join(str(x) for x in vals[:15])
                            if v_str.strip():
                                parts.append(f"**{k}:** {v_str}")
            except (json.JSONDecodeError, TypeError):
                pass
    return "\n\n".join(parts) if parts else ""


class LukeBarousseAdapter(BaseAdapter):
    """lukebarousse/data_jobs — builds description from job_title, job_location, job_via, job_skills, etc."""

    source_id = "lukebarousse/data_jobs"

    def to_canonical(self, record: Dict[str, Any]) -> Dict[str, Any]:
        title = record.get("job_title_short") or record.get("job_title") or "Unknown Title"
        job_id = record.get("job_id")
        ext_id = str(job_id) if job_id else hashlib.md5(str(title)[:80].encode()).hexdigest()
        skills = _extract_skills(record.get("job_skills"))
        desc = record.get("job_description") or _build_data_jobs_description(record)
        return {
            "id": str(job_id or hashlib.md5(f"{title}{record.get('company_name','')}".encode()).hexdigest()),
            "external_id": ext_id,
            "platform": "huggingface_dataset",
            "title": title,
            "company": record.get("company_name", ""),
            "description": desc,
            "requirements": "",
            "skills": skills,
            "budget_min": record.get("salary_year_avg"),
            "budget_max": record.get("salary_year_max"),
            "budget_type": "fixed",
            "url": record.get("job_posting_url", ""),
            "posted_at": record.get("job_posted_date") or _generate_recent_date(),
            "source": self.source_id,
            "status": "new",
            "client_rating": round(random.uniform(4.0, 5.0), 1),
        }


class DatastaxLinkedInAdapter(BaseAdapter):
    """datastax/linkedin_job_listings."""

    source_id = "datastax/linkedin_job_listings"

    def to_canonical(self, record: Dict[str, Any]) -> Dict[str, Any]:
        title = record.get("title") or record.get("job_title") or "Unknown Title"
        desc = record.get("description") or record.get("skills_desc", "")
        url = record.get("job_posting_url") or record.get("application_url", "")
        ext_id = hashlib.md5((url or title)[:80].encode()).hexdigest()
        posted = record.get("original_listed_time") or record.get("listed_time") or _generate_recent_date()
        return {
            "id": hashlib.md5(f"{title}{record.get('company_name','')}".encode()).hexdigest(),
            "external_id": ext_id,
            "platform": "huggingface_dataset",
            "title": title,
            "company": record.get("company_name", record.get("company", "")),
            "description": desc,
            "requirements": "",
            "skills": _extract_skills(record.get("skills_desc", record.get("skills", ""))),
            "budget_min": record.get("min_salary"),
            "budget_max": record.get("max_salary"),
            "budget_type": "fixed",
            "url": url,
            "posted_at": posted,
            "source": self.source_id,
            "status": "new",
            "client_rating": round(random.uniform(4.0, 5.0), 1),
        }


class ITJobPostingsAdapter(BaseAdapter):
    """debasmitamukherjee/IT_job_postings and similar."""

    def __init__(self, source_id: str = "debasmitamukherjee/IT_job_postings"):
        self.source_id = source_id

    def to_canonical(self, record: Dict[str, Any]) -> Dict[str, Any]:
        title = record.get("Job Title") or record.get("title", "Unknown Title")
        company = record.get("Company") or record.get("company", "Tech Company")
        ext_id = hashlib.md5(str(title)[:80].encode()).hexdigest()
        return {
            "id": hashlib.md5(f"{title}{company}".encode()).hexdigest(),
            "external_id": ext_id,
            "platform": "huggingface_dataset",
            "title": title,
            "company": company,
            "description": record.get("Job Description") or record.get("description", ""),
            "requirements": record.get("Requirements") or record.get("requirements", ""),
            "skills": _extract_skills(record.get("Skills") or record.get("skills", "")),
            "budget_min": record.get("Salary") or record.get("salary"),
            "budget_max": None,
            "budget_type": "fixed",
            "url": "",
            "posted_at": _generate_recent_date(),
            "source": self.source_id,
            "status": "new",
            "client_rating": round(random.uniform(4.0, 5.0), 1),
        }


class FreelancerAdapter(BaseAdapter):
    """Freelancer scraper output. Expects title, description, company, url, external_id, skills."""

    platform = "freelancer"
    source_id = "freelancer"

    def to_canonical(self, record: Dict[str, Any]) -> Dict[str, Any]:
        ext_id = record.get("external_id") or record.get("id") or hashlib.md5(
            (record.get("url") or record.get("title", ""))[:80].encode()
        ).hexdigest()
        return {
            "id": ext_id,
            "external_id": str(ext_id),
            "platform": self.platform,
            "title": record.get("title", "Unknown"),
            "company": record.get("company", ""),
            "description": record.get("description", ""),
            "requirements": record.get("requirements", ""),
            "skills": _extract_skills(record.get("skills")),
            "budget_min": record.get("budget_min"),
            "budget_max": record.get("budget_max"),
            "budget_type": record.get("budget_type", "fixed"),
            "url": record.get("url", ""),
            "posted_at": record.get("posted_at") or _generate_recent_date(),
            "source": self.source_id,
            "status": "new",
            "client_rating": round(random.uniform(4.0, 5.0), 1),
        }


class ManualUploadAdapter(BaseAdapter):
    """Bulk upload: unknown schema, alias probing."""

    platform = "manual"
    source_id = "manual_upload"

    def to_canonical(self, record: Dict[str, Any]) -> Dict[str, Any]:
        title = _probe_field(record, FIELD_ALIASES["title"]) or "Unknown Title"
        company = _probe_field(record, FIELD_ALIASES["company"]) or ""
        desc = _probe_field(record, FIELD_ALIASES["description"]) or ""
        ext_id = record.get("external_id") or record.get("id") or hashlib.md5(
            f"{title}{company}{desc[:50]}".encode()
        ).hexdigest()
        skills = _extract_skills(_probe_field(record, FIELD_ALIASES["skills"]))
        if not skills:
            skills = _extract_skills(desc[:500])
        return {
            "id": ext_id,
            "external_id": str(ext_id),
            "platform": self.platform,
            "title": str(title),
            "company": str(company),
            "description": str(desc),
            "requirements": str(_probe_field(record, FIELD_ALIASES["requirements"]) or ""),
            "skills": skills,
            "budget_min": _probe_field(record, FIELD_ALIASES["budget_min"]),
            "budget_max": _probe_field(record, FIELD_ALIASES["budget_max"]),
            "budget_type": "fixed",
            "url": str(_probe_field(record, FIELD_ALIASES["url"]) or ""),
            "posted_at": _probe_field(record, FIELD_ALIASES["posted_at"]) or _generate_recent_date(),
            "source": self.source_id,
            "status": "new",
            "client_rating": round(random.uniform(4.0, 5.0), 1),
        }


class GenericHFAdapter(BaseAdapter):
    """Fallback for unknown HF datasets; probes common field names."""

    def __init__(self, source_id: str):
        self.source_id = source_id

    def to_canonical(self, record: Dict[str, Any]) -> Dict[str, Any]:
        title = _probe_field(record, FIELD_ALIASES["title"]) or "Unknown Title"
        company = _probe_field(record, FIELD_ALIASES["company"]) or "Company"
        desc = _probe_field(record, FIELD_ALIASES["description"]) or ""
        ext_id = hashlib.md5(f"{title}{company}{desc[:50]}".encode()).hexdigest()
        return {
            "id": hashlib.md5(f"{title}{company}{desc[:50]}".encode()).hexdigest(),
            "external_id": ext_id,
            "platform": "huggingface_dataset",
            "title": title,
            "company": company,
            "description": desc,
            "requirements": str(_probe_field(record, FIELD_ALIASES["requirements"]) or ""),
            "skills": _extract_skills(_probe_field(record, FIELD_ALIASES["skills"])),
            "budget_min": _probe_field(record, FIELD_ALIASES["budget_min"]),
            "budget_max": _probe_field(record, FIELD_ALIASES["budget_max"]),
            "budget_type": "fixed",
            "url": str(_probe_field(record, FIELD_ALIASES["url"]) or ""),
            "posted_at": _probe_field(record, FIELD_ALIASES["posted_at"]) or _generate_recent_date(),
            "source": self.source_id,
            "status": "new",
            "client_rating": round(random.uniform(4.0, 5.0), 1),
        }


SOURCE_REGISTRY: Dict[str, BaseAdapter] = {
    "jacob-hugging-face/job-descriptions": JacobHFAdapter(),
    "lukebarousse/data_jobs": LukeBarousseAdapter(),
    "datastax/linkedin_job_listings": DatastaxLinkedInAdapter(),
    "debasmitamukherjee/IT_job_postings": ITJobPostingsAdapter(),
    "freelancer": FreelancerAdapter(),
    "manual_upload": ManualUploadAdapter(),
}


def get_adapter(source_id: str) -> BaseAdapter:
    """Return adapter for source; fallback to GenericHFAdapter for unknown HF datasets."""
    if source_id in SOURCE_REGISTRY:
        return SOURCE_REGISTRY[source_id]
    if "/" in source_id and "huggingface" in source_id.lower():
        return GenericHFAdapter(source_id)
    if "IT_job" in source_id or "it_job" in source_id.lower():
        return ITJobPostingsAdapter(source_id)
    return GenericHFAdapter(source_id)


def normalize_to_canonical(record: Dict[str, Any], source_id: str) -> Dict[str, Any]:
    """Map raw record to canonical job dict using registry."""
    adapter = get_adapter(source_id)
    return adapter.to_canonical(record)
