from fastapi import APIRouter

from app.dependencies import CurrentUser, PracticeServiceDep
from app.schemas.jobs import ReportJobHandle
from app.schemas.practice import (
    AnswerCompletedRequest,
    InterviewReport,
    PracticeConfig,
    PracticeSession,
    SocketTicket,
)

router = APIRouter(tags=["practice"])


@router.post("/sessions", response_model=PracticeSession, status_code=201)
async def create_session(
    body: PracticeConfig, current_user: CurrentUser, practice: PracticeServiceDep
) -> PracticeSession:
    return await practice.create_session(current_user.id, body)


@router.get("/sessions/{session_id}", response_model=PracticeSession)
async def get_session(
    session_id: str, current_user: CurrentUser, practice: PracticeServiceDep
) -> PracticeSession:
    return await practice.get_session(current_user.id, session_id)


@router.post("/sessions/{session_id}/start", response_model=PracticeSession)
async def start_session(
    session_id: str, current_user: CurrentUser, practice: PracticeServiceDep
) -> PracticeSession:
    return await practice.start_session(current_user.id, session_id)


@router.post("/sessions/{session_id}/answers", response_model=PracticeSession)
async def submit_answer(
    session_id: str,
    body: AnswerCompletedRequest,
    current_user: CurrentUser,
    practice: PracticeServiceDep,
) -> PracticeSession:
    return await practice.submit_answer(current_user.id, session_id, body)


@router.post("/sessions/{session_id}/complete", response_model=ReportJobHandle, status_code=202)
async def complete_session(
    session_id: str, current_user: CurrentUser, practice: PracticeServiceDep
) -> ReportJobHandle:
    return await practice.complete_session(current_user.id, session_id)


@router.get("/sessions/{session_id}/report", response_model=InterviewReport)
async def get_session_report(
    session_id: str, current_user: CurrentUser, practice: PracticeServiceDep
) -> InterviewReport:
    return await practice.get_report_by_session(current_user.id, session_id)


@router.post("/sessions/{session_id}/socket-ticket", response_model=SocketTicket)
async def issue_socket_ticket(
    session_id: str, current_user: CurrentUser, practice: PracticeServiceDep
) -> SocketTicket:
    return await practice.issue_socket_ticket(current_user.id, session_id)


@router.get("/reports/{report_id}", response_model=InterviewReport)
async def get_report(
    report_id: str, current_user: CurrentUser, practice: PracticeServiceDep
) -> InterviewReport:
    return await practice.get_report_by_id(current_user.id, report_id)
