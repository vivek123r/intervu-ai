from datetime import timedelta
from typing import Any

from app.ai.provider import AIProvider
from app.core.ids import IdPrefix, new_id
from app.core.timeutils import utcnow
from app.errors.codes import ErrorCode
from app.errors.exceptions import NotFoundError, ValidationAppError
from app.repositories.practice import PracticeSessionRepository
from app.repositories.reports import ReportRepository
from app.repositories.tickets import SocketTicketRepository
from app.schemas.common import JobType, SessionState
from app.schemas.jobs import ReportJobHandle
from app.schemas.practice import (
    AnswerCompletedRequest,
    InterviewReport,
    PracticeConfig,
    PracticeSession,
    SessionAnswer,
    SocketTicket,
)
from app.schemas.preparation import Question
from app.services.jobs import JobService
from app.services.session_state import wire_status

_SESSION_NOT_FOUND = "That session could not be found."
_REPORT_NOT_FOUND = "That report is not ready yet."
TICKET_TTL_SECONDS = 60


def _minutes_to_question_count(duration_minutes: int) -> int:
    return max(3, duration_minutes // 6)


class PracticeService:
    def __init__(
        self,
        sessions: PracticeSessionRepository,
        reports: ReportRepository,
        tickets: SocketTicketRepository,
        ai: AIProvider,
        jobs: JobService,
    ) -> None:
        self._sessions = sessions
        self._reports = reports
        self._tickets = tickets
        self._ai = ai
        self._jobs = jobs

    async def create_session(self, user_id: str, config: PracticeConfig) -> PracticeSession:
        doc = {
            "id": new_id(IdPrefix.SESSION),
            "user_id": user_id,
            "state": SessionState.CREATED,
            "config": config.model_dump(),
            "questions": [],
            "current_question_index": 0,
            "answers": [],
            "started_at": None,
        }
        await self._sessions.insert(doc)
        return self._to_wire(doc)

    async def get_session(self, user_id: str, session_id: str) -> PracticeSession:
        doc = await self._require_session(user_id, session_id)
        return self._to_wire(doc)

    async def start_session(self, user_id: str, session_id: str) -> PracticeSession:
        doc = await self._require_session(user_id, session_id)
        config = PracticeConfig(**doc["config"])
        questions = self._ai.generate_questions(config, _minutes_to_question_count(config.duration))

        updated = await self._sessions.update(
            user_id,
            session_id,
            {
                "state": SessionState.INTRODUCTION,
                "questions": [q.model_dump() for q in questions],
                "started_at": utcnow(),
            },
        )
        assert updated is not None
        return self._to_wire(updated)

    async def submit_answer(
        self, user_id: str, session_id: str, request: AnswerCompletedRequest
    ) -> PracticeSession:
        doc = await self._require_session(user_id, session_id)
        questions = [Question(**q) for q in doc["questions"]]
        question = next((q for q in questions if q.id == request.question_id), None)
        if question is None:
            raise ValidationAppError("That question isn't part of this session.")

        answer = SessionAnswer(
            question_id=request.question_id,
            question=question.text,
            transcript=request.transcript,
            duration_seconds=max(1, round(request.duration_ms / 1000)),
            score=self._ai.score_answer(question, request.transcript),
        )

        next_index = min(doc["current_question_index"] + 1, max(0, len(questions) - 1))
        updated = await self._sessions.update(
            user_id,
            session_id,
            {
                "answers": [*doc["answers"], answer.model_dump()],
                "current_question_index": next_index,
            },
        )
        assert updated is not None
        return self._to_wire(updated)

    async def complete_session(self, user_id: str, session_id: str) -> ReportJobHandle:
        doc = await self._require_session(user_id, session_id)
        config = PracticeConfig(**doc["config"])
        answers = [SessionAnswer(**a) for a in doc["answers"]]

        content = self._ai.generate_report(config, answers)
        report_doc = {
            "id": new_id(IdPrefix.REPORT),
            "session_id": session_id,
            "user_id": user_id,
            "created_at": utcnow(),
            **content,
        }
        await self._reports.insert(report_doc)
        await self._sessions.update(user_id, session_id, {"state": SessionState.COMPLETED})

        handle = await self._jobs.create(user_id, JobType.REPORT_GENERATION, report_doc["id"])
        return ReportJobHandle(job_id=handle.job_id, type=handle.type, session_id=session_id)

    async def get_report_by_session(self, user_id: str, session_id: str) -> InterviewReport:
        doc = await self._reports.get_by_session_id(user_id, session_id)
        if doc is None:
            raise NotFoundError(ErrorCode.REPORT_NOT_FOUND, _REPORT_NOT_FOUND)
        return InterviewReport(**doc)

    async def get_report_by_id(self, user_id: str, report_id: str) -> InterviewReport:
        doc = await self._reports.get_by_id(user_id, report_id)
        if doc is None:
            raise NotFoundError(ErrorCode.REPORT_NOT_FOUND, _REPORT_NOT_FOUND)
        return InterviewReport(**doc)

    async def issue_socket_ticket(self, user_id: str, session_id: str) -> SocketTicket:
        await self._require_session(user_id, session_id)
        expires_at = utcnow() + timedelta(seconds=TICKET_TTL_SECONDS)
        doc = {
            "id": new_id(IdPrefix.TICKET),
            "session_id": session_id,
            "user_id": user_id,
            "expires_at": expires_at,
        }
        await self._tickets.insert(doc)
        return SocketTicket(ticket=doc["id"], expires_at=expires_at)

    async def _require_session(self, user_id: str, session_id: str) -> dict[str, Any]:
        doc = await self._sessions.get(user_id, session_id)
        if doc is None:
            raise NotFoundError(ErrorCode.SESSION_NOT_FOUND, _SESSION_NOT_FOUND)
        return doc

    @staticmethod
    def _to_wire(doc: dict[str, Any]) -> PracticeSession:
        return PracticeSession(
            id=doc["id"],
            status=wire_status(doc["state"]),
            config=PracticeConfig(**doc["config"]),
            questions=[Question(**q) for q in doc["questions"]],
            current_question_index=doc["current_question_index"],
            answers=[SessionAnswer(**a) for a in doc["answers"]],
            started_at=doc["started_at"],
        )
