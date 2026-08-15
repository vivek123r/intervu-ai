from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ResumeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    file_name: str
    file_type: str
    parsed_data: dict[str, object]
    parse_status: str
    is_primary: bool
    created_at: datetime


class JobDescriptionCreate(BaseModel):
    interview_id: UUID | None = None
    raw_text: str = Field(min_length=80, max_length=100_000)
    company_name: str | None = Field(default=None, max_length=180)
    role_title: str | None = Field(default=None, max_length=180)


class JobDescriptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    interview_id: UUID | None
    raw_text: str
    company_name: str | None
    role_title: str | None
    parsed_data: dict[str, object]
    role_match_data: dict[str, object]
    parse_status: str
    created_at: datetime
    updated_at: datetime


class RoleMatchRead(BaseModel):
    score: float
    required_matches: list[str]
    preferred_matches: list[str]
    skill_gaps: list[str]
    components: dict[str, float]
