from fastapi import APIRouter

from app.dependencies import (
    CompletionServiceDep,
    CurrentUser,
    PracticeServiceDep,
    ReportConversationServiceDep,
)
from app.schemas.conversation import ReportChatRequest, ReportChatResponse, ReportConversation
from app.schemas.jobs import ReportJobHandle
from app.schemas.practice import (
    AnswerCompletedRequest,
    InterviewReport,
    PracticeConfig,
    PracticeSession,
    SessionCompletion,
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


@router.get("/sessions/{session_id}/completion", response_model=SessionCompletion)
async def get_session_completion(
    session_id: str, current_user: CurrentUser, completion: CompletionServiceDep
) -> SessionCompletion:
    return await completion.get_by_session_id(current_user.id, session_id)


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


# The completion screen is reached with a report id (analysis.completed and every history
# row link there), so this — not the session-scoped route above — is the one the frontend
# actually calls.
@router.get("/reports/{report_id}/completion", response_model=SessionCompletion)
async def get_report_completion(
    report_id: str, current_user: CurrentUser, completion: CompletionServiceDep
) -> SessionCompletion:
    return await completion.get_by_report_id(current_user.id, report_id)


# Post-interview voice/text Q&A about a completed report — "why this score", "what
# would a better answer look like". Twinned report-id/session-id routes for the same
# reason report/completion are: analysis.completed and every history row link to a
# report id, but the live interview room only ever knows its session id.
@router.get("/reports/{report_id}/chat", response_model=ReportConversation)
async def get_report_chat(
    report_id: str, current_user: CurrentUser, conversation: ReportConversationServiceDep
) -> ReportConversation:
    return await conversation.get_thread(current_user.id, report_id)


@router.post("/reports/{report_id}/chat", response_model=ReportChatResponse)
async def post_report_chat(
    report_id: str,
    body: ReportChatRequest,
    current_user: CurrentUser,
    conversation: ReportConversationServiceDep,
) -> ReportChatResponse:
    return await conversation.ask(current_user.id, report_id, body)


@router.get("/sessions/{session_id}/chat", response_model=ReportConversation)
async def get_session_chat(
    session_id: str, current_user: CurrentUser, conversation: ReportConversationServiceDep
) -> ReportConversation:
    return await conversation.get_thread_by_session(current_user.id, session_id)


@router.post("/sessions/{session_id}/chat", response_model=ReportChatResponse)
async def post_session_chat(
    session_id: str,
    body: ReportChatRequest,
    current_user: CurrentUser,
    conversation: ReportConversationServiceDep,
) -> ReportChatResponse:
    return await conversation.ask_by_session(current_user.id, session_id, body)
