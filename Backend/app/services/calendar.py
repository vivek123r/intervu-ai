from typing import Any

from app.core.timeutils import utcnow
from app.repositories.calendar import CalendarConnectionRepository
from app.schemas.calendar import CalendarConnection, ConnectCalendarResponse
from app.schemas.common import CalendarStatus, JobType
from app.schemas.jobs import JobHandle
from app.services.jobs import JobService

_DISCONNECTED: dict[str, Any] = {
    "connected": False,
    "provider": None,
    "account_email": None,
    "scopes": [],
    "last_sync_at": None,
    "status": None,
}

# Google OAuth is intentionally out of scope here (see docs/API-CONTRACT.md's Calendar
# section) — connect() mock-succeeds instantly instead of a real authorization round trip.
_MOCK_ACCOUNT_EMAIL = "alex.morgan@example.com"
_MOCK_SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]


class CalendarService:
    def __init__(self, connections: CalendarConnectionRepository, jobs: JobService) -> None:
        self._connections = connections
        self._jobs = jobs

    async def get_connection(self, user_id: str) -> CalendarConnection:
        doc = await self._connections.get(user_id)
        return CalendarConnection(**(doc or _DISCONNECTED))

    async def connect(self, user_id: str) -> ConnectCalendarResponse:
        await self._connections.upsert(
            user_id,
            {
                "connected": True,
                "provider": "google",
                "account_email": _MOCK_ACCOUNT_EMAIL,
                "scopes": _MOCK_SCOPES,
                "last_sync_at": utcnow(),
                "status": CalendarStatus.HEALTHY,
            },
        )
        return ConnectCalendarResponse(
            authorization_url="https://accounts.google.com/o/oauth2/v2/auth?mock=true"
        )

    async def sync(self, user_id: str) -> JobHandle:
        current = await self.get_connection(user_id)
        updated = current.model_copy(update={"last_sync_at": utcnow()})
        await self._connections.upsert(user_id, updated.model_dump())
        return await self._jobs.create(user_id, JobType.CALENDAR_SYNC, user_id)

    async def disconnect(self, user_id: str) -> None:
        await self._connections.upsert(user_id, _DISCONNECTED)
