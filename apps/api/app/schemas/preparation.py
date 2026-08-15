from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import PreparationTaskStatus


class PreparationTaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    date: date
    position: int
    category: str
    title: str
    description: str
    estimated_minutes: int
    status: PreparationTaskStatus
    priority: int
    resource_type: str | None
    resource_id: UUID | None


class PreparationPlanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    interview_id: UUID
    start_date: date
    interview_date: date
    overall_progress: float
    generated_at: datetime
    tasks: list[PreparationTaskRead]


class PreparationTaskUpdate(BaseModel):
    status: PreparationTaskStatus
