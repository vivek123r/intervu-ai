from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import InterviewSource, InterviewStatus


class InterviewRoundCreate(BaseModel):
    position: int = Field(ge=1, le=12)
    name: str = Field(min_length=1, max_length=120)
    type: str = Field(min_length=1, max_length=64)
    scheduled_at: datetime | None = None
    status: str = Field(default="pending", max_length=32)
    notes: str | None = Field(default=None, max_length=2000)


class InterviewRoundRead(InterviewRoundCreate):
    model_config = ConfigDict(from_attributes=True)

    id: UUID


class InterviewCreate(BaseModel):
    company_name: str = Field(min_length=1, max_length=180)
    role_title: str = Field(min_length=1, max_length=180)
    interview_type: str = Field(default="technical", max_length=64)
    round_name: str | None = Field(default=None, max_length=120)
    round_number: int | None = Field(default=None, ge=1, le=20)
    total_rounds: int | None = Field(default=None, ge=1, le=20)
    scheduled_at: datetime
    timezone: str = Field(default="UTC", max_length=64)
    duration_minutes: int = Field(default=60, ge=10, le=480)
    meeting_type: str | None = Field(default=None, max_length=64)
    meeting_url: str | None = Field(default=None, max_length=2000)
    location: str | None = Field(default=None, max_length=1000)
    notes: str | None = Field(default=None, max_length=5000)
    rounds: list[InterviewRoundCreate] = Field(default_factory=list, max_length=12)

    @model_validator(mode="after")
    def validate_round_numbers(self) -> InterviewCreate:
        if self.round_number and self.total_rounds and self.round_number > self.total_rounds:
            raise ValueError("round_number cannot exceed total_rounds")
        return self


class InterviewUpdate(BaseModel):
    company_name: str | None = Field(default=None, min_length=1, max_length=180)
    role_title: str | None = Field(default=None, min_length=1, max_length=180)
    interview_type: str | None = Field(default=None, max_length=64)
    round_name: str | None = Field(default=None, max_length=120)
    round_number: int | None = Field(default=None, ge=1, le=20)
    total_rounds: int | None = Field(default=None, ge=1, le=20)
    scheduled_at: datetime | None = None
    timezone: str | None = Field(default=None, max_length=64)
    duration_minutes: int | None = Field(default=None, ge=10, le=480)
    meeting_type: str | None = Field(default=None, max_length=64)
    meeting_url: str | None = Field(default=None, max_length=2000)
    location: str | None = Field(default=None, max_length=1000)
    status: InterviewStatus | None = None
    notes: str | None = Field(default=None, max_length=5000)


class InterviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_name: str
    role_title: str
    interview_type: str
    round_name: str | None
    round_number: int | None
    total_rounds: int | None
    scheduled_at: datetime
    timezone: str
    duration_minutes: int
    meeting_type: str | None
    meeting_url: str | None
    location: str | None
    status: InterviewStatus
    source: InterviewSource
    readiness_score: float | None
    readiness_components: dict[str, float]
    preparation_progress: float
    detection_confidence: float | None
    detection_evidence: list[str]
    notes: str | None
    created_at: datetime
    updated_at: datetime
    rounds: list[InterviewRoundRead] = Field(default_factory=list)


class InterviewConfirmation(BaseModel):
    confirmed: bool


class DashboardOverview(BaseModel):
    next_interview: InterviewRead | None
    upcoming_interviews: list[InterviewRead]
    readiness_score: float
    readiness_components: dict[str, float]
    today_completed: int
    today_total: int
    recommended_minutes: int
    weak_topics: list[dict[str, object]]
    improvement_percent: float
