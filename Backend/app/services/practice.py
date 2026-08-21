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

        first_question, opening_line = await asyncio.gather(
            self._ai.generate_first_question(
                config,
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
        planned_count = doc.get("planned_question_count") or _minutes_to_question_count(
            config.duration
        )

        updated = await self._sessions.update(
            user_id,
            session_id,
            {
                "state": SessionState.INTRODUCTION,
                "questions": [first_question.model_dump()],
                "planned_question_count": planned_count,
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
        config = PracticeConfig(**doc["config"])

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
        check_idx = root_idx + 1
        while check_idx < len(questions) and questions[check_idx].follow_up:
            follow_ups_used_on_root += 1
            check_idx += 1

        planned_count = doc.get("planned_question_count") or _minutes_to_question_count(
            config.duration
        )
        roots_asked = sum(
            1
            for a in doc.get("answers", [])
            if not next((q.follow_up for q in questions if q.id == a.get("question_id")), False)
        )
        if not question.follow_up:
            roots_asked += 1

        total_follow_ups_so_far = sum(1 for q in questions if q.follow_up)
        follow_up_budget = max(0, planned_count - total_follow_ups_so_far)
        roots_remaining = max(0, planned_count - roots_asked)

        topics_covered = [q.topic for q in questions]
        recent_scores = [float(a.get("score", 7.0)) for a in doc.get("answers", [])][-5:]

        log_entries = [InterviewerLogEntry(**entry) for entry in doc.get("interviewer_log", [])]
        answers_so_far = [SessionAnswer(**a) for a in doc.get("answers", [])]

        if config.resume_id and self._resumes:
            resume_doc = await self._resumes.get_by_id(user_id, config.resume_id)
        elif self._resumes:
            resume_doc = await self._resumes.get_current_for_user(user_id)
        else:
            resume_doc = None

        ctx = TurnContext(
            config=config,
            question=question,
            transcript=request.transcript,
            log=log_entries,
            answers_so_far=answers_so_far,
            follow_ups_used_on_root=follow_ups_used_on_root,
            follow_up_budget=follow_up_budget,
            roots_remaining=roots_remaining,
            planned_root_count=planned_count,
            roots_asked=roots_asked,
            topics_covered=topics_covered,
            recent_scores=recent_scores,
            resume_context=resume_doc,
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
        next_question_obj: Question | None = None
        next_index = question_idx

        if allow_follow_up and decision.follow_up:
            new_question = Question(
                id=new_id(IdPrefix.QUESTION),
                text=decision.follow_up.text,
                category=question.category,
                topic=decision.follow_up.topic,
                difficulty=decision.follow_up.difficulty,
                follow_up=True,
            )
            question_dicts.append(new_question.model_dump())
            next_index = len(question_dicts) - 1
            next_question_obj = new_question
        elif roots_asked < planned_count:
            decision.action = "advance"
            decision.follow_up = None

            # Next root selection: (a) decision.next_root, (b) unasked in doc (legacy), (c) fallback_next_root
            if decision.next_root and decision.next_root.text.strip():
                new_root = Question(
                    id=new_id(IdPrefix.QUESTION),
                    text=decision.next_root.text.strip(),
                    category=decision.next_root.category or question.category,
                    topic=decision.next_root.topic or "System Architecture",
                    difficulty=decision.next_root.difficulty or config.difficulty,
                    follow_up=False,
                )
            elif question_idx + 1 < len(questions):
                # Legacy unasked question in doc
                new_root = questions[question_idx + 1]
            else:
                new_root = await self._ai.fallback_next_root(
                    config, topics_covered, [*recent_scores, decision.score]
                )

            # If new_root is not already in question_dicts, append it
            if not any(q["id"] == new_root.id for q in question_dicts):
                question_dicts.append(new_root.model_dump())
                next_index = len(question_dicts) - 1
            else:
                next_index = next(
                    idx for idx, q in enumerate(question_dicts) if q["id"] == new_root.id
                )
            next_question_obj = new_root
        else:
            # All planned roots answered
            decision.action = "advance"
            decision.follow_up = None
            next_question_obj = None

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
        questions = [Question(**q) for q in doc.get("questions", [])]
        planned = doc.get("planned_question_count")
        if planned is None:
            planned = sum(1 for q in questions if not q.follow_up)
        return PracticeSession(
            id=doc["id"],
            status=wire_status(doc["state"]),
            config=PracticeConfig(**doc["config"]),
            questions=questions,
            current_question_index=doc["current_question_index"],
            answers=[SessionAnswer(**a) for a in doc.get("answers", [])],
            planned_question_count=planned,
            interviewer_log=[
                InterviewerLogEntry(**entry) for entry in doc.get("interviewer_log", [])
            ],
            started_at=doc.get("started_at"),
        )
