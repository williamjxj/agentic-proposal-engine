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

    # ETL / Job Persistence Configuration
    etl_use_persistence: bool = Field(default=False, alias="ETL_USE_PERSISTENCE")
    hf_etl_schedule_hours: int = Field(default=168, alias="HF_ETL_SCHEDULE_HOURS")  # 168 = weekly
    freelancer_etl_schedule_hours: int = Field(default=24, alias="FREELANCER_ETL_SCHEDULE_HOURS")  # 24 = daily

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
