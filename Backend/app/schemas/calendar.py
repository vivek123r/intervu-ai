from app.core.serialization import CamelModel
from app.core.timeutils import UtcDatetime
from app.schemas.common import CalendarStatus


class CalendarConnection(CamelModel):
    connected: bool
    provider: str | None
    account_email: str | None
    scopes: list[str]
    last_sync_at: UtcDatetime | None
    status: CalendarStatus | None


class ConnectCalendarResponse(CamelModel):
    authorization_url: str
