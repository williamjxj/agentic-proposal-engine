"""
Domain Filter for ETL Pipeline

All scraping and HuggingFace dataset loading must pass this domain filter
before any data enters the pipeline. Per autobidder-etl-rag-schema-spec Section 1.1.
"""

from typing import Tuple

ALLOWED_DOMAINS = {
    "ai_ml": [
        "machine learning", "deep learning", "LLM", "GPT", "RAG", "AI agent",
        "NLP", "computer vision", "MLOps", "fine-tuning", "transformer",
        "LangChain", "LangGraph", "OpenAI", "Claude", "Gemini", "vector database",
        "embedding", "AI engineer", "AI consultant", "generative AI", "agentic AI",
    ],
    "web_development": [
        "React", "Next.js", "Vue", "Angular", "TypeScript", "JavaScript",
        "frontend", "backend", "REST API", "GraphQL", "full-stack", "web developer",
        "Node.js", "FastAPI", "Django", "Flask", "web application",
    ],
    "fullstack_engineering": [
        "full stack", "fullstack", "software engineer", "software developer",
        "senior engineer", "tech lead", "architect", "API development",
        "microservices", "SaaS", "platform engineer",
    ],
    "devops_mlops": [
        "DevOps", "MLOps", "CI/CD", "GitHub Actions", "Jenkins", "Kubernetes",
        "Docker", "container", "Helm", "ArgoCD", "Terraform", "Ansible",
        "infrastructure as code", "IaC", "pipeline", "deployment", "SRE",
    ],
    "cloud_infrastructure": [
        "AWS", "Azure", "GCP", "Google Cloud", "cloud architect", "cloud engineer",
        "cloud native", "serverless", "Lambda", "EC2", "S3", "CloudFormation",
        "cloud migration", "hybrid cloud", "cloud consultant", "infrastructure",
    ],
    "software_outsourcing": [
        "contract", "freelance", "outsource", "remote contract", "consultant",
        "software contractor", "IT contractor", "project basis", "hourly contract",
        "fixed price", "staff augmentation", "offshore", "nearshore",
    ],
    "ui_design": [
        "UI design", "UX design", "Figma", "product design", "design system",
        "user interface", "user experience", "wireframe", "prototype",
        "interaction design", "visual design", "UI/UX",
    ],
}


def passes_domain_filter(text: str) -> Tuple[bool, str]:
    """
    Check if text matches at least one allowed domain category.

    Args:
        text: Text to check (e.g. job description, title)

    Returns:
        Tuple of (passes, matched_category). If no match, category is empty string.
    """
    if not text or not isinstance(text, str):
        return False, ""

    text_lower = text.lower()
    for category, keywords in ALLOWED_DOMAINS.items():
        if any(kw.lower() in text_lower for kw in keywords):
            return True, category
    return False, ""
