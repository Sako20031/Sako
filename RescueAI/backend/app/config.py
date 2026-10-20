"""Runtime configuration. Every secret comes from the environment; nothing is hardcoded."""
from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_SECRET = "dev-only-insecure-secret-change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="RESCUE_", extra="ignore")

    environment: Literal["development", "test", "production"] = "development"
    database_url: str = "sqlite:///./rescue_ai.db"
    secret_key: str = DEV_SECRET
    access_token_minutes: int = 12 * 60  # one ambulance shift
    bcrypt_rounds: int = 12
    cookie_secure: bool = False
    cors_origins: list[str] = Field(default_factory=list)

    # Uploads
    storage_dir: str = "./storage"
    max_upload_mb: int = 15
    max_image_pixels: int = 50_000_000  # decompression-bomb guard
    max_pdf_pages: int = 5

    # Retention: saved encounter images and analyses older than this are purged.
    retention_days: int = 30

    # AI provider. "none" means analysis is honestly reported as unavailable.
    ai_provider: Literal["none", "anthropic"] = "none"
    anthropic_api_key: str | None = None
    ai_model: str = "claude-opus-5-5"
    ai_timeout_seconds: float = 90.0
    ai_max_retries: int = 2
    ai_effort: Literal["low", "medium", "high", "xhigh", "max"] = "high"
    # Patient images may only leave this server when the operator has confirmed
    # a data-processing agreement / authorization with the provider.
    ai_external_images_authorized: bool = False

    # Rate limits (per user, per minute)
    rate_limit_analyses_per_minute: int = 6
    rate_limit_login_per_minute: int = 10

    @model_validator(mode="after")
    def _production_guards(self) -> "Settings":
        if self.environment == "production":
            if self.secret_key == DEV_SECRET or len(self.secret_key) < 32:
                raise ValueError("RESCUE_SECRET_KEY must be set to a strong value in production")
            if not self.cookie_secure:
                raise ValueError("RESCUE_COOKIE_SECURE must be true in production (HTTPS only)")
        return self

    @property
    def ai_configured(self) -> bool:
        return self.ai_provider == "anthropic" and bool(self.anthropic_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
