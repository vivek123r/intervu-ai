from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    display_name: str
    avatar_url: str | None
    experience_level: str | None
    target_roles: list[str]
    primary_skills: list[str]
    preferred_language: str
    timezone: str
    onboarding_completed: bool
    created_at: datetime
    last_active_at: datetime


class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=160)
    experience_level: str | None = Field(default=None, max_length=64)
    target_roles: list[str] | None = None
    primary_skills: list[str] | None = None
    preferred_language: str | None = Field(default=None, max_length=32)
    timezone: str | None = Field(default=None, max_length=64)
    onboarding_completed: bool | None = None
