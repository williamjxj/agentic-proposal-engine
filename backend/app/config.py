"""
Configuration Module - Environment Variables and Settings

Loads and validates environment variables using Pydantic Settings.
"""

from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True,
    )

    # OpenAI Configuration (optional, only needed if using OpenAI as LLM provider)
    openai_api_key: Optional[str] = Field(None, alias="OPENAI_API_KEY")
    openai_embedding_model: str = Field(
        default="text-embedding-3-small", alias="OPENAI_EMBEDDING_MODEL"
    )
    openai_completion_model: str = Field(
        default="gpt-4-turbo-preview", alias="OPENAI_COMPLETION_MODEL"
    )
    openai_max_tokens: int = Field(default=2000, alias="OPENAI_MAX_TOKENS")
    openai_temperature: float = Field(default=0.7, alias="OPENAI_TEMPERATURE")

    # DeepSeek Configuration
    llm_provider: str = Field(default="openai", alias="LLM_PROVIDER")
    deepseek_model: str = Field(default="deepseek-chat", alias="DEEPSEEK_MODEL")
    deepseek_api_key: Optional[str] = Field(None, alias="DEEPSEEK_API_KEY")
    deepseek_temperature: float = Field(default=0.5, alias="DEEPSEEK_TEMPERATURE")
    deepseek_api_base: str = Field(
        default="https://api.deepseek.com/v1", alias="DEEPSEEK_API_BASE"
    )
    deepseek_max_tokens: int = Field(default=4096, alias="DEEPSEEK_MAX_TOKENS")

    # JWT Authentication
    jwt_secret: str = Field(default="your-secret-key-change-in-production", alias="JWT_SECRET")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    jwt_expiration_minutes: int = Field(default=10080, alias="JWT_EXPIRATION_MINUTES")  # 7 days

    # Database and Storage Configuration
    database_url: Optional[str] = Field(None, alias="DATABASE_URL")
    chroma_persist_dir: str = Field(default="./chroma_db", alias="CHROMA_PERSIST_DIR")
    chroma_host: Optional[str] = Field(None, alias="CHROMA_HOST")  # If set, uses HTTP client instead of local
    chroma_port: int = Field(default=8000, alias="CHROMA_PORT")  # Docker ChromaDB runs on port 8000 internally
    data_dir: str = Field(default="data", alias="DATA_DIR")
    encryption_key: Optional[str] = Field(None, alias="ENCRYPTION_KEY")

    # Model Configuration
    embed_model: str = Field(
        default="sentence-transformers/all-MiniLM-L6-v2", alias="EMBED_MODEL"
    )
    disable_model_source_check: bool = Field(
        default=True, alias="DISABLE_MODEL_SOURCE_CHECK"
    )

    # Application Configuration
    environment: str = Field(default="development", alias="ENVIRONMENT")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    max_workers: int = Field(default=4, alias="MAX_WORKERS")

    # CORS Configuration
    cors_origins: str = Field(
        default="http://localhost:3000,http://localhost:3001", alias="CORS_ORIGINS"
    )

    # Rate Limiting
    rate_limit_per_minute: int = Field(default=10, alias="RATE_LIMIT_PER_MINUTE")

    # Document Processing
    max_file_size_mb: int = Field(default=50, alias="MAX_FILE_SIZE_MB")
    chunk_size: int = Field(default=1000, alias="CHUNK_SIZE")
    chunk_overlap: int = Field(default=200, alias="CHUNK_OVERLAP")
    kb_storage_dir: str = Field(default="./data/kb", alias="KB_STORAGE_DIR")
    backend_root: str = Field(default=".", alias="BACKEND_ROOT")

    # ETL / Job Persistence Configuration
    etl_use_persistence: bool = Field(default=False, alias="ETL_USE_PERSISTENCE")
    project_filter_keywords: Optional[str] = Field(
        default=None,
        alias="PROJECT_FILTER_KEYWORDS",
        description="Comma-separated default filter keywords when user has none (006)",
    )
    hf_etl_schedule_hours: int = Field(default=168, alias="HF_ETL_SCHEDULE_HOURS")  # 168 = weekly
    freelancer_etl_schedule_hours: int = Field(default=24, alias="FREELANCER_ETL_SCHEDULE_HOURS")  # 24 = daily

    # Autonomous Bidding (004-improve-autonomous)
    auto_discovery_enabled: bool = Field(default=False, alias="AUTO_DISCOVERY_ENABLED")
    resend_api_key: Optional[str] = Field(None, alias="RESEND_API_KEY")
    auto_proposal_threshold: float = Field(default=0.85, alias="AUTO_PROPOSAL_THRESHOLD")

    # Email Testing Configuration
    # When TEST_MODE=true, all emails go to TEST_EMAIL instead of actual recipients
    # This allows testing without sending to real customer emails
    test_mode: bool = Field(default=False, alias="TEST_MODE")
    test_email: Optional[str] = Field(None, alias="TEST_EMAIL")

    # Email sender address (FROM field) - MUST be from a verified domain in Resend
    # Default: service@bestitconsulting.ca (verified domain)
    from_email: str = Field(
        default="service@bestitconsulting.ca",
        alias="FROM_EMAIL",
    )

    # BCC email - receives copy of all sent proposals for archiving
    # Leave blank to disable BCC feature
    bcc_email: str | None = Field(
        default="bestitconsultingca@gmail.com",
        alias="BCC_EMAIL",
    )

    # Proposal submission email (receiver/TO field) - fallback when customer email not found
    # Can be any valid email address
    proposal_submit_email: str = Field(
        default="bestitconsultingca@gmail.com",
        alias="PROPOSAL_SUBMIT_EMAIL",
    )

    # Company Contact Information (for email signatures and branding)
    company_name: str = Field(default="Best IT Consulting", alias="COMPANY_NAME")
    company_website: str = Field(default="https://www.bestitconsulting.ca", alias="COMPANY_WEBSITE")
    company_phone: str = Field(default="(236) 992-3846", alias="COMPANY_PHONE")
    company_email: str = Field(default="service@bestitconsulting.ca", alias="COMPANY_EMAIL")
    company_logo_url: str = Field(
        default="https://www.bestitconsulting.ca/logo.png",
        alias="COMPANY_LOGO_URL",
        description="Public URL for company logo in email signatures (must be accessible to email clients)"
    )

    # User Profile (for proposal signatures)
    user_full_name: str = Field(default="William Jiang", alias="USER_FULL_NAME")
    user_title: str = Field(default="Co-Founder / Full-Stack & AI Engineer", alias="USER_TITLE")
    user_linkedin: Optional[str] = Field(default=None, alias="USER_LINKEDIN")
    user_github: Optional[str] = Field(default=None, alias="USER_GITHUB")

    # Workflow Optimization Configuration
    session_state_ttl_hours: int = Field(default=24, alias="SESSION_STATE_TTL_HOURS")
    draft_retention_hours: int = Field(default=24, alias="DRAFT_RETENTION_HOURS")
    max_draft_size_kb: int = Field(default=1000, alias="MAX_DRAFT_SIZE_KB")
    enable_workflow_analytics: bool = Field(default=True, alias="ENABLE_WORKFLOW_ANALYTICS")

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def max_file_size_bytes(self) -> int:
        """Convert max file size from MB to bytes."""
        return self.max_file_size_mb * 1024 * 1024

    @property
    def max_draft_size_bytes(self) -> int:
        """Convert max draft size from KB to bytes."""
        return self.max_draft_size_kb * 1024


# Global settings instance
settings = Settings()
