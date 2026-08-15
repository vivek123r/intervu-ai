from fastapi import APIRouter, Response
from fastapi.responses import RedirectResponse

from app.dependencies import CalendarServiceDep, CurrentUser, SettingsDep
from app.schemas.calendar import CalendarConnection, ConnectCalendarResponse
from app.schemas.jobs import JobHandle

router = APIRouter(tags=["calendar"])


@router.get("/calendar/connection", response_model=CalendarConnection)
async def get_calendar_connection(
    current_user: CurrentUser, calendar: CalendarServiceDep
) -> CalendarConnection:
    return await calendar.get_connection(current_user.id)


@router.post("/calendar/connect", response_model=ConnectCalendarResponse)
async def connect_calendar(
    current_user: CurrentUser, calendar: CalendarServiceDep
) -> ConnectCalendarResponse:
    return await calendar.connect(current_user.id)


@router.post("/calendar/sync", response_model=JobHandle, status_code=202)
async def sync_calendar(current_user: CurrentUser, calendar: CalendarServiceDep) -> JobHandle:
    return await calendar.sync(current_user.id)


@router.delete("/calendar/connection", status_code=204, response_class=Response)
async def disconnect_calendar(
    current_user: CurrentUser, calendar: CalendarServiceDep
) -> Response:
    await calendar.disconnect(current_user.id)
    return Response(status_code=204)


@router.get("/calendar/callback", include_in_schema=False)
async def calendar_callback(settings: SettingsDep) -> RedirectResponse:
    return RedirectResponse(url=f"{settings.app_url}/settings/integrations?calendarConnected=true")
