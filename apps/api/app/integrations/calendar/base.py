from __future__ import annotations

from datetime import datetime
from typing import Protocol

from pydantic import BaseModel

from app.schemas.calendar import NormalizedCalendarEvent


class CalendarCredentials(BaseModel):
    access_token: str
    refresh_token: str | None = None
    expiry: datetime | None = None
    scopes: list[str]


class CalendarFetchResult(BaseModel):
    events: list[NormalizedCalendarEvent]
    credentials: CalendarCredentials


class CalendarProvider(Protocol):
    def authorization_url(self, *, state: str) -> str: ...

    async def exchange_code(self, code: str) -> CalendarCredentials: ...

    async def fetch_upcoming(
        self, credentials: CalendarCredentials, *, days: int = 90
    ) -> CalendarFetchResult: ...

    async def revoke(self, access_token: str) -> None: ...
