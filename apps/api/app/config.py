from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Intervu AI API"
    app_version: str = "0.1.0"
    environment: Literal["development", "test", "staging", "production"] = "development"
    log_level: str = "INFO"
    web_origin: str = "http://localhost:3000"

    database_url: str = "postgresql+asyncpg://intervu:intervu@localhost:5432/intervu"
    redis_url: str = "redis://localhost:6379/0"

    auth_mode: Literal["mock", "firebase"] = "mock"
    firebase_project_id: str | None = None
    firebase_client_email: str | None = None
    firebase_private_key: str | None = None

    google_client_id: str | None = None
    google_client_secret: str | None = None
    google_redirect_uri: str = "http://localhost:8000/api/v1/calendar/callback"
    google_calendar_scopes: str = "https://www.googleapis.com/auth/calendar.readonly"

    app_encryption_key: str = "development-only-change-me"
    oauth_state_secret: str = "development-oauth-state-change-me"

    ai_provider: Literal["mock", "openrouter"] = "mock"
    openrouter_api_key: str | None = None
    openrouter_model: str = "deepseek/deepseek-v4-flash"
    ai_model_interview: str | None = None
    ai_model_analysis: str | None = None
    ai_model_preparation: str | None = None
    ai_model_classification: str | None = None
    ai_request_timeout_seconds: float = Field(default=25.0, ge=1, le=120)
    ai_max_retries: int = Field(default=2, ge=0, le=4)

    file_storage_provider: Literal["local"] = "local"
    local_storage_path: Path = Path(".data/uploads")
    max_upload_mb: int = Field(default=10, ge=1, le=50)
    rate_limit_enabled: bool = True

    max_followups_per_question: int = Field(default=2, ge=0, le=5)
    max_questions_per_section: int = Field(default=6, ge=1, le=20)
    max_session_minutes: int = Field(default=90, ge=5, le=180)

    @field_validator("firebase_private_key", mode="before")
    @classmethod
    def normalize_private_key(cls, value: object) -> object:
        if isinstance(value, str):
            return value.replace("\\n", "\n")
        return value

    @model_validator(mode="after")
    def validate_runtime_secrets(self) -> Settings:
        if self.environment == "production":
            if self.auth_mode != "firebase":
                raise ValueError("AUTH_MODE=firebase is required in production")
            if self.app_encryption_key == "development-only-change-me":
                raise ValueError("APP_ENCRYPTION_KEY must be replaced in production")
            if self.oauth_state_secret == "development-oauth-state-change-me":
                raise ValueError("OAUTH_STATE_SECRET must be replaced in production")
        if self.ai_provider == "openrouter" and not self.openrouter_api_key:
            raise ValueError("OPENROUTER_API_KEY is required when AI_PROVIDER=openrouter")
        return self

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.web_origin.split(",") if origin.strip()]

    @property
    def calendar_scopes(self) -> list[str]:
        return [scope.strip() for scope in self.google_calendar_scopes.split(",") if scope.strip()]

    def model_for(
        self, workload: Literal["interview", "analysis", "preparation", "classification"]
    ) -> str:
        configured = {
            "interview": self.ai_model_interview,
            "analysis": self.ai_model_analysis,
            "preparation": self.ai_model_preparation,
            "classification": self.ai_model_classification,
        }[workload]
        return configured or self.openrouter_model


@lru_cache
def get_settings() -> Settings:
    return Settings()
