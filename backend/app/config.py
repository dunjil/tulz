import json
import secrets
from functools import lru_cache
from typing import Literal, Any

from pydantic import model_validator, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "Tulz"
    app_version: str = "1.0.0"
    debug: bool = False
    environment: Literal["development", "staging", "production"] = "development"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    # SECURITY: In production, set ALLOWED_ORIGINS to your actual frontend domain(s)
    # Example: ALLOWED_ORIGINS=["https://yourdomain.com"]
    allowed_origins: Any = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: any) -> list[str]:
        """Parse allowed_origins from string (JSON or CSV) if needed."""
        if isinstance(v, str):
            v = v.strip()
            # If it's a JSON list (starts with [)
            if v.startswith("[") and v.endswith("]"):
                try:
                    # Try double quotes first
                    return json.loads(v)
                except json.JSONDecodeError:
                    # If JSON fails, it might be due to single quotes ['a', 'b']
                    # We'll try to fix common single quote issues for robustness
                    try:
                        return json.loads(v.replace("'", '"'))
                    except:
                        pass
            
            # Fallback to comma-separated string
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    # Frontend URL for redirects (must match one of allowed_origins)
    frontend_url: str = "http://localhost:3000"

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/toolhub"
    database_url_sync: str = "postgresql://postgres:postgres@localhost:5432/toolhub"

    # JWT Authentication
    # SECURITY: secret_key MUST be set via environment variable in production
    # Generate with: python -c "import secrets; print(secrets.token_urlsafe(64))"
    secret_key: str = ""  # Required - no default for security
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.environment == "production"

    # ZeptoMail
    zeptomail_api_key: str = ""
    zeptomail_from_email: str = "noreply@tulz.tools"
    zeptomail_from_name: str = "Tulz"

    # File Upload
    max_file_size_mb: int = 50
    temp_file_dir: str = "/tmp/toolhub"
    temp_file_ttl_hours: int = 1

    # Rate Limiting (free tier)
    free_daily_uses: int = 3
    rate_limit_per_minute: int = 30

    @property
    def max_file_size_bytes(self) -> int:
        """Return max file size in bytes."""
        return self.max_file_size_mb * 1024 * 1024

    @model_validator(mode="after")
    def validate_security_settings(self) -> "Settings":
        """Validate critical security settings."""
        # In production, secret_key is required and must be strong
        if self.environment == "production":
            if not self.secret_key or len(self.secret_key) < 32:
                raise ValueError(
                    "SECRET_KEY must be set and at least 32 characters in production. "
                    "Generate with: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
                )
            # Warn about dangerous defaults in production
            if "localhost" in str(self.allowed_origins):
                import warnings
                warnings.warn(
                    "SECURITY WARNING: localhost in allowed_origins in production mode",
                    RuntimeWarning,
                )
        else:
            # In development, generate a random key if not set
            if not self.secret_key:
                self.secret_key = secrets.token_urlsafe(64)
        return self


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
