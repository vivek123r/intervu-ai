import asyncio
from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from app.ai.provider import AIProvider
from app.core.ids import IdPrefix, new_id
from app.core.timeutils import utcnow
from app.errors.codes import ErrorCode
from app.errors.exceptions import NotFoundError, ValidationAppError
from app.repositories.documents import ResumeRepository
from app.repositories.practice import PracticeSessionRepository
from app.repositories.reports import ReportRepository
from app.repositories.tickets import SocketTicketRepository
from app.schemas.common import JobType, SessionState
from app.schemas.interviewer import (
    InterviewerLogEntry,
    TurnContext,
    TurnDecision,
)
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


@dataclass(frozen=True)
class TurnOutcome:
    session: PracticeSession
    decision: TurnDecision | None
    next_question: Question | None


class PracticeService:
    def __init__(
        self,
        sessions: PracticeSessionRepository,
        reports: ReportRepository,
        tickets: SocketTicketRepository,
        ai: AIProvider,
        jobs: JobService,
        resumes: ResumeRepository | None = None,
    ) -> None:
        self._sessions = sessions
        self._reports = reports
        self._tickets = tickets
        self._ai = ai
        self._jobs = jobs
        self._resumes = resumes

    async def create_session(self, user_id: str, config: PracticeConfig) -> PracticeSession:
        doc = {
            "id": new_id(IdPrefix.SESSION),
            "user_id": user_id,
            "state": SessionState.CREATED,
            "config": config.model_dump(),
            "questions": [],
            "current_question_index": 0,
            "answers": [],
            "interviewer_log": [],
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
        if config.resume_id and self._resumes:
            resume_doc = await self._resumes.get_by_id(user_id, config.resume_id)
        elif self._resumes:
            resume_doc = await self._resumes.get_current_for_user(user_id)
        else:
            resume_doc = None

        questions, opening_line = await asyncio.gather(
            self._ai.generate_questions(
                config,
                _minutes_to_question_count(config.duration),
                resume_context=resume_doc,
            ),
            self._ai.generate_opening(config, resume_context=resume_doc),
        )
        initial_log = [
            InterviewerLogEntry(
                speaker="interviewer",
                kind="intro",
                text=opening_line,
            ).model_dump()
        ]

        updated = await self._sessions.update(
            user_id,
            session_id,
            {
                "state": SessionState.INTRODUCTION,
                "questions": [q.model_dump() for q in questions],
                "interviewer_log": initial_log,
                "started_at": utcnow(),
            },
        )
        assert updated is not None
        return self._to_wire(updated)

    async def submit_answer_turn(
        self, user_id: str, session_id: str, request: AnswerCompletedRequest
    ) -> TurnOutcome:
        doc = await self._require_session(user_id, session_id)

        # Idempotency guard: if this question is already answered, return current state without duplicate action
        if any(a.get("question_id") == request.question_id for a in doc.get("answers", [])):
            questions = [Question(**q) for q in doc["questions"]]
            current_idx = doc["current_question_index"]
            next_q = questions[current_idx] if current_idx < len(questions) else None
            return TurnOutcome(session=self._to_wire(doc), decision=None, next_question=next_q)

        questions = [Question(**q) for q in doc["questions"]]
        question_idx = next(
            (idx for idx, q in enumerate(questions) if q.id == request.question_id),
            None,
        )
        if question_idx is None:
            raise ValidationAppError("That question isn't part of this session.")

        question = questions[question_idx]

        # Calculate follow-ups used on this root question
        follow_ups_used_on_root = 0
        root_idx = question_idx
        while root_idx > 0 and questions[root_idx].follow_up:
            root_idx -= 1
        # Count all follow-ups linked to this root
        check_idx = root_idx + 1
        while check_idx < len(questions) and questions[check_idx].follow_up:
            follow_ups_used_on_root += 1
            check_idx += 1

        root_questions_count = sum(1 for q in questions if not q.follow_up)
        total_follow_ups_so_far = sum(1 for q in questions if q.follow_up)
        follow_up_budget = max(0, root_questions_count - total_follow_ups_so_far)
        roots_answered = sum(
            1 for a in doc.get("answers", [])
            if not next((q.follow_up for q in questions if q.id == a.get("question_id")), False)
        )
        roots_remaining = max(0, root_questions_count - roots_answered - (0 if question.follow_up else 1))

        log_entries = [
            InterviewerLogEntry(**entry) for entry in doc.get("interviewer_log", [])
        ]
        answers_so_far = [SessionAnswer(**a) for a in doc.get("answers", [])]

        ctx = TurnContext(
            config=PracticeConfig(**doc["config"]),
            question=question,
            transcript=request.transcript,
            log=log_entries,
            answers_so_far=answers_so_far,
            follow_ups_used_on_root=follow_ups_used_on_root,
            follow_up_budget=follow_up_budget,
            roots_remaining=roots_remaining,
        )

        decision = await self._ai.interviewer_turn(ctx)

        # Policy enforcement: follow-up only allowed if under root limit (max 2) and within overall budget
        allow_follow_up = (
            decision.action == "follow_up"
            and decision.follow_up is not None
            and follow_ups_used_on_root < 2
            and follow_up_budget > 0
        )

        question_dicts = [q.model_dump() for q in questions]
        if allow_follow_up and decision.follow_up:
            new_question = Question(
                id=new_id(IdPrefix.QUESTION),
                text=decision.follow_up.text,
                category=question.category,
                topic=decision.follow_up.topic,
                difficulty=decision.follow_up.difficulty,
                follow_up=True,
            )
            # Insert follow-up directly after current question
            insert_pos = question_idx + 1
            question_dicts.insert(insert_pos, new_question.model_dump())
            next_index = insert_pos
            next_question_obj: Question | None = new_question
        else:
            # Advance
            decision.action = "advance"
            decision.follow_up = None
            next_index = min(question_idx + 1, len(question_dicts) - 1)
            next_question_obj = (
                Question(**question_dicts[question_idx + 1])
                if question_idx + 1 < len(question_dicts)
                else None
            )

        answer = SessionAnswer(
            question_id=request.question_id,
            question=question.text,
            transcript=request.transcript,
            duration_seconds=max(1, round(request.duration_ms / 1000)),
            score=decision.score,
            strengths=decision.strengths,
            missing=decision.missing,
            follow_up=bool(question.follow_up),
        )

        new_log = [
            *doc.get("interviewer_log", []),
            InterviewerLogEntry(
                speaker="candidate",
                kind="answer",
                text=request.transcript,
                question_id=request.question_id,
            ).model_dump(),
            InterviewerLogEntry(
                speaker="interviewer",
                kind="transition",
                text=decision.transition,
                question_id=request.question_id,
            ).model_dump(),
        ]

        updated = await self._sessions.update(
            user_id,
            session_id,
            {
                "questions": question_dicts,
                "answers": [*doc.get("answers", []), answer.model_dump()],
                "interviewer_log": new_log,
                "current_question_index": next_index,
            },
        )
        assert updated is not None
        wire_session = self._to_wire(updated)
        return TurnOutcome(session=wire_session, decision=decision, next_question=next_question_obj)

    async def submit_answer(
        self, user_id: str, session_id: str, request: AnswerCompletedRequest
    ) -> PracticeSession:
        outcome = await self.submit_answer_turn(user_id, session_id, request)
        return outcome.session

    async def complete_session(self, user_id: str, session_id: str) -> ReportJobHandle:
        doc = await self._require_session(user_id, session_id)
        config = PracticeConfig(**doc["config"])
        answers = [SessionAnswer(**a) for a in doc.get("answers", [])]
        log = [InterviewerLogEntry(**entry) for entry in doc.get("interviewer_log", [])]

        wrap_up_line = await self._ai.generate_wrap_up(config, answers, log)
        wrap_up_entry = InterviewerLogEntry(
            speaker="interviewer",
            kind="wrap_up",
            text=wrap_up_line,
        ).model_dump()

        updated_log = [*doc.get("interviewer_log", []), wrap_up_entry]

        content = await self._ai.generate_report(
            config,
            answers,
            interviewer_log=[InterviewerLogEntry(**e) for e in updated_log],
        )

        report_doc = {
            "id": new_id(IdPrefix.REPORT),
            "session_id": session_id,
            "user_id": user_id,
            "created_at": utcnow(),
            **content,
        }
        await self._reports.insert(report_doc)
        await self._sessions.update(
            user_id,
            session_id,
            {
                "state": SessionState.COMPLETED,
                "interviewer_log": updated_log,
            },
        )

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
            questions=[Question(**q) for q in doc.get("questions", [])],
            current_question_index=doc["current_question_index"],
            answers=[SessionAnswer(**a) for a in doc.get("answers", [])],
            interviewer_log=[
                InterviewerLogEntry(**entry)
                for entry in doc.get("interviewer_log", [])
            ],
            started_at=doc.get("started_at"),
        )
