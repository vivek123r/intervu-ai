from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    log_level: str = "INFO"
    web_origin: str = "http://localhost:3000"

    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db: str = "intervu"

    auth_mode: Literal["mock", "firebase"] = "mock"
    firebase_project_id: str | None = None
    firebase_client_email: str | None = None
    firebase_private_key: str | None = None

    google_client_id: str | None = None
    google_client_secret: str | None = None
    google_redirect_uri: str | None = None
    google_calendar_scopes: str = "https://www.googleapis.com/auth/calendar.readonly"

    app_encryption_key: str = "development-only-change-me"
    oauth_state_secret: str = "development-oauth-state-change-me"

    ai_provider: str = "mock"
    openrouter_api_key: str | None = None
    openrouter_model: str = "deepseek/deepseek-chat"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    file_storage_provider: str = "local"
    local_storage_path: str = ".data/uploads"
    max_upload_mb: int = 10
    rate_limit_enabled: bool = False

    # Coding Judge (Piston) settings
    piston_base_url: str = "http://localhost:2000/api/v2"
    judge_compile_timeout_ms: int = 5000
    judge_run_timeout_ms: int = 3000
    judge_memory_limit_bytes: int = 536870912  # 512MB
    max_testcases_per_run: int = 5
    max_code_length: int = 65536  # 64KB

    @property
    def app_url(self) -> str:
        return self.web_origin


@lru_cache
def get_settings() -> Settings:
    return Settings()
