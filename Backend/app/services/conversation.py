from typing import Any

from app.ai.provider import AIProvider
from app.core.timeutils import utcnow
from app.errors.codes import ErrorCode
from app.errors.exceptions import NotFoundError
from app.repositories.conversations import ReportConversationRepository
from app.repositories.practice import PracticeSessionRepository
from app.repositories.reports import ReportRepository
from app.schemas.conversation import (
    ConversationTurn,
    ReportChatRequest,
    ReportChatResponse,
    ReportConversation,
)
from app.schemas.practice import PracticeConfig

_REPORT_NOT_FOUND = "That report is not ready yet."


def _fallback_config() -> PracticeConfig:
    """A report whose session has since been deleted still has a Q&A thread — this
    keeps grounding generic rather than failing outright, mirroring
    CompletionService's own fallback for the same situation."""
    return PracticeConfig(
        role="Practice interview",
        company="Self-directed",
        type="technical",
        difficulty="normal",
        duration=0,
        focus_areas=[],
        interviewer_style="Senior engineer",
    )


def _find_question_context(
    report: dict[str, Any], session: dict[str, Any] | None, question_id: str | None
) -> dict[str, Any] | None:
    """The one report answer review the candidate is asking about, matched from a
    session question id via question text — the same join CompletionService's
    `_questions` does, simplified to just what grounding needs."""
    if not question_id or not session:
        return None
    asked = session.get("questions", [])
    target = next((q for q in asked if q.get("id") == question_id), None)
    if target is None:
        return None
    target_text = str(target.get("text", "")).strip().lower()
    return next(
        (
            r
            for r in report.get("answers", [])
            if str(r.get("question", "")).strip().lower() == target_text
        ),
        None,
    )


class ReportConversationService:
    """Post-interview voice/text Q&A about a completed report — "why this score",
    "what would a better answer look like". Grounded strictly in the stored report,
    the session's questions, and the candidate's own transcripts."""

    def __init__(
        self,
        reports: ReportRepository,
        sessions: PracticeSessionRepository,
        conversations: ReportConversationRepository,
        ai: AIProvider,
    ) -> None:
        self._reports = reports
        self._sessions = sessions
        self._conversations = conversations
        self._ai = ai

    async def get_thread(self, user_id: str, report_id: str) -> ReportConversation:
        await self._require_report(user_id, report_id)
        doc = await self._conversations.get(user_id, report_id)
        turns = doc.get("turns", []) if doc else []
        return ReportConversation(
            report_id=report_id, turns=[ConversationTurn(**t) for t in turns]
        )

    async def get_thread_by_session(self, user_id: str, session_id: str) -> ReportConversation:
        report = await self._require_report_by_session(user_id, session_id)
        return await self.get_thread(user_id, report["id"])

    async def ask(
        self, user_id: str, report_id: str, request: ReportChatRequest
    ) -> ReportChatResponse:
        report = await self._require_report(user_id, report_id)
        return await self._ask(user_id, report, request)

    async def ask_by_session(
        self, user_id: str, session_id: str, request: ReportChatRequest
    ) -> ReportChatResponse:
        report = await self._require_report_by_session(user_id, session_id)
        return await self._ask(user_id, report, request)

    async def _ask(
        self, user_id: str, report: dict[str, Any], request: ReportChatRequest
    ) -> ReportChatResponse:
        report_id = report["id"]
        session = await self._sessions.get(user_id, report["session_id"])
        config = PracticeConfig(**session["config"]) if session else _fallback_config()

        existing_doc = await self._conversations.get(user_id, report_id)
        history = [
            {"speaker": t["speaker"], "text": t["text"]}
            for t in (existing_doc.get("turns", []) if existing_doc else [])
        ]
        question_context = _find_question_context(report, session, request.question_id)

        reply_text = await self._ai.answer_report_question(
            config, report, question_context, history, request.message
        )

        now = utcnow()
        candidate_turn = ConversationTurn(
            speaker="candidate",
            text=request.message,
            question_id=request.question_id,
            created_at=now,
        ).model_dump()
        assistant_turn = ConversationTurn(
            speaker="assistant",
            text=reply_text,
            question_id=request.question_id,
            created_at=now,
        ).model_dump()

        updated = await self._conversations.append_turns(
            user_id, report_id, [candidate_turn, assistant_turn]
        )
        turns = [ConversationTurn(**t) for t in updated.get("turns", [])]
        return ReportChatResponse(reply=turns[-1], turns=turns)

    async def _require_report(self, user_id: str, report_id: str) -> dict[str, Any]:
        report = await self._reports.get_by_id(user_id, report_id)
        if report is None:
            raise NotFoundError(ErrorCode.REPORT_NOT_FOUND, _REPORT_NOT_FOUND)
        return report

    async def _require_report_by_session(
        self, user_id: str, session_id: str
    ) -> dict[str, Any]:
        report = await self._reports.get_by_session_id(user_id, session_id)
        if report is None:
            raise NotFoundError(ErrorCode.REPORT_NOT_FOUND, _REPORT_NOT_FOUND)
        return report
