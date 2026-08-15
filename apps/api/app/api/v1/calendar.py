from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import RedirectResponse, Response

from app.ai.orchestrator import AIOrchestrator
from app.config import Settings, get_settings
from app.core.encryption import TokenCipher
from app.core.security import OAuthStateSigner
from app.dependencies import (
    CurrentUser,
    DbSession,
    get_ai_orchestrator,
    get_oauth_state_signer,
    get_token_cipher,
)
from app.repositories.calendar import CalendarConnectionRepository
from app.schemas.calendar import (
    CalendarConnectionRead,
    CalendarConnectRequest,
    CalendarConnectResponse,
    CalendarSyncResult,
)
from app.services.calendar import CalendarService

router = APIRouter(prefix="/calendar", tags=["Calendar"])


def service(
    session: DbSession,
    settings: Settings = Depends(get_settings),
    cipher: TokenCipher = Depends(get_token_cipher),
    signer: OAuthStateSigner = Depends(get_oauth_state_signer),
    ai: AIOrchestrator = Depends(get_ai_orchestrator),
) -> CalendarService:
    return CalendarService(session=session, settings=settings, cipher=cipher, signer=signer, ai=ai)


@router.get("/connection", response_model=CalendarConnectionRead | None)
async def get_connection(user: CurrentUser, session: DbSession) -> CalendarConnectionRead | None:
    connection = await CalendarConnectionRepository(session).get_for_user(user.id)
    return CalendarConnectionRead.model_validate(connection) if connection else None


@router.post("/connect", response_model=CalendarConnectResponse)
async def connect_calendar(
    payload: CalendarConnectRequest,
    user: CurrentUser,
    calendar_service: CalendarService = Depends(service),
) -> CalendarConnectResponse:
    return await calendar_service.begin_connect(user, payload.redirect_path)


@router.get("/callback", response_class=RedirectResponse)
async def calendar_callback(
    state: str = Query(min_length=8),
    code: str = Query(min_length=1),
    settings: Settings = Depends(get_settings),
    calendar_service: CalendarService = Depends(service),
) -> RedirectResponse:
    redirect_path = await calendar_service.complete_callback(state=state, code=code)
    return RedirectResponse(f"{settings.web_origin}{redirect_path}?calendar=connected")


@router.post("/sync", response_model=CalendarSyncResult)
async def sync_calendar(
    user: CurrentUser, calendar_service: CalendarService = Depends(service)
) -> CalendarSyncResult:
    return await calendar_service.sync(user)


@router.delete("/connection", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect_calendar(
    user: CurrentUser, calendar_service: CalendarService = Depends(service)
) -> Response:
    await calendar_service.disconnect(user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
