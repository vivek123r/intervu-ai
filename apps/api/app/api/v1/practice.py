from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel

from app.ai.orchestrator import AIOrchestrator
from app.config import Settings, get_settings
from app.core.security import WebSocketTicketSigner
from app.dependencies import (
    CurrentUser,
    DbSession,
    get_ai_orchestrator,
    get_websocket_ticket_signer,
)
from app.schemas.practice import (
    AnswerResult,
    InterviewReportRead,
    PracticeSessionCreate,
    PracticeSessionRead,
    SessionAnswerCreate,
)
from app.services.practice import PracticeService

router = APIRouter(prefix="/practice", tags=["Practice"])


class SocketTicket(BaseModel):
    ticket: str
    expires_in_seconds: int = 90


def service(
    session: DbSession,
    ai: AIOrchestrator = Depends(get_ai_orchestrator),
    settings: Settings = Depends(get_settings),
) -> PracticeService:
    return PracticeService(session=session, ai=ai, settings=settings)


@router.post("/sessions", response_model=PracticeSessionRead, status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: PracticeSessionCreate,
    user: CurrentUser,
    practice_service: PracticeService = Depends(service),
) -> PracticeSessionRead:
    return await practice_service.create(user, payload)


@router.get("/sessions/{session_id}", response_model=PracticeSessionRead)
async def get_session(
    session_id: UUID,
    user: CurrentUser,
    practice_service: PracticeService = Depends(service),
) -> PracticeSessionRead:
    return await practice_service.get(user, session_id)


@router.post("/sessions/{session_id}/start", response_model=PracticeSessionRead)
async def start_session(
    session_id: UUID,
    user: CurrentUser,
    practice_service: PracticeService = Depends(service),
) -> PracticeSessionRead:
    return await practice_service.start(user, session_id)


@router.post("/sessions/{session_id}/answers", response_model=AnswerResult)
async def submit_answer(
    session_id: UUID,
    payload: SessionAnswerCreate,
    user: CurrentUser,
    practice_service: PracticeService = Depends(service),
) -> AnswerResult:
    return await practice_service.answer(user, session_id, payload)


@router.post("/sessions/{session_id}/complete", response_model=InterviewReportRead)
async def complete_session(
    session_id: UUID,
    user: CurrentUser,
    practice_service: PracticeService = Depends(service),
) -> InterviewReportRead:
    return await practice_service.complete(user, session_id)


@router.get("/sessions/{session_id}/report", response_model=InterviewReportRead)
async def get_report(
    session_id: UUID,
    user: CurrentUser,
    practice_service: PracticeService = Depends(service),
) -> InterviewReportRead:
    return await practice_service.report(user, session_id)


@router.post("/sessions/{session_id}/socket-ticket", response_model=SocketTicket)
async def create_socket_ticket(
    session_id: UUID,
    user: CurrentUser,
    practice_service: PracticeService = Depends(service),
    signer: WebSocketTicketSigner = Depends(get_websocket_ticket_signer),
) -> SocketTicket:
    await practice_service.get(user, session_id)
    return SocketTicket(ticket=signer.create(user_id=str(user.id), session_id=str(session_id)))
