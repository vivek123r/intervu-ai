from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    type: str
    title: str
    body: str
    action_label: str | None
    action_url: str | None
    payload: dict[str, object]
    scheduled_for: datetime | None
    sent_at: datetime | None
    read_at: datetime | None
    created_at: datetime


class ProcessingJobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    type: str
    status: str
    progress: int
    phase: str | None
    result: dict[str, object]
    error_code: str | None
    error_message: str | None
    created_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
