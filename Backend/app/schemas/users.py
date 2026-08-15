from app.core.serialization import CamelModel
from app.core.timeutils import UtcDatetime
from app.schemas.common import ExperienceLevel


class User(CamelModel):
    id: str
    email: str
    display_name: str
    avatar_url: str | None = None
    timezone: str
    target_role: str
    experience_level: ExperienceLevel
    preferred_language: str
    skills: list[str]
    onboarding_completed: bool
    created_at: UtcDatetime


class UpdateUserRequest(CamelModel):
    display_name: str | None = None
    timezone: str | None = None
    target_role: str | None = None
    experience_level: ExperienceLevel | None = None
    preferred_language: str | None = None
    skills: list[str] | None = None
