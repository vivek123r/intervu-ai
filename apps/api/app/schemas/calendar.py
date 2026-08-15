from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import CalendarConnectionStatus


class CalendarConnectRequest(BaseModel):
    redirect_path: str = Field(default="/onboarding", pattern=r"^/")


class CalendarConnectResponse(BaseModel):
    authorization_url: str
    mode: str


class CalendarConnectionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    provider: str
    provider_account_email: str | None
    scope: str
    status: CalendarConnectionStatus
    last_sync_at: datetime | None
    last_success_at: datetime | None
    created_at: datetime


class NormalizedCalendarEvent(BaseModel):
    provider_event_id: str
    title: str
    description: str = ""
    start_at: datetime
    end_at: datetime
    timezone: str = "UTC"
    organizer_email: str | None = None
    attendee_emails: list[str] = Field(default_factory=list)
    location: str | None = None
    meeting_url: str | None = None
    status: str = "confirmed"
    is_all_day: bool = False


class CalendarSyncResult(BaseModel):
    fetched: int
    candidates: int
    created: int
    updated: int
    ignored: int
    interview_ids: list[UUID]
    synced_at: datetime
