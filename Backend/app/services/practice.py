import asyncio
import logging
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from pymongo.errors import DuplicateKeyError

from app.ai.provider import AIProvider, scored_answers
from app.core.ids import IdPrefix, new_id
from app.core.timeutils import utcnow
from app.errors.codes import ErrorCode
from app.errors.exceptions import NotFoundError, ValidationAppError
from app.repositories.completions import CompletionInsightRepository
from app.repositories.documents import ResumeRepository
from app.repositories.history import HistoryRepository
from app.repositories.practice import PracticeSessionRepository
from app.repositories.reports import ReportRepository
from app.repositories.tickets import SocketTicketRepository
from app.schemas.common import (
    AnswerAnalysisStatus,
    HistoryStatus,
    JobType,
    MetricTone,
    SessionState,
)
from app.schemas.interviewer import (
    AnswerAnalysisContext,
    InterviewerLogEntry,
    TurnContext,
    TurnRouting,
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
from app.services.analysis import AnalysisRegistry
from app.services.analytics import AnalyticsService
from app.services.jobs import JobService
from app.services.session_state import wire_status

logger = logging.getLogger(__name__)

_SESSION_NOT_FOUND = "That session could not be found."
_REPORT_NOT_FOUND = "That report is not ready yet."
TICKET_TTL_SECONDS = 60

# Finishing a session is reachable twice at once: the realtime layer runs its own
# wrap-up/drain/finalize sequence for `session.end` while the plain REST
# `/sessions/{id}/complete` endpoint runs `complete_session`. Both used to pass the
# "does a report already exist?" check concurrently and each pay for a full
# report + insights LLM round-trip, with the loser dying on the unique index over
# `reports.session_id`. Serializing per session makes the second caller wait and
# then observe the first one's report.
#
# In-process only, matching the single-worker assumption documented in
# Backend/README.md — the unique index remains the actual correctness guarantee,
# and `finalize_report` handles DuplicateKeyError for the multi-worker case.
_finalize_locks: dict[str, asyncio.Lock] = {}


def _finalize_lock(session_id: str) -> asyncio.Lock:
    lock = _finalize_locks.get(session_id)
    if lock is None:
        lock = asyncio.Lock()
        _finalize_locks[session_id] = lock
    return lock


def _history_code(report_id: str) -> str:
    """The short human-readable code shown on the history log and results page.

    Derived purely from the report id, which is already unique, so two sessions
    finishing at the same moment can't collide.
    """
    suffix = report_id.split("-")[-1].upper()
    return f"IVU-{suffix[:8]}"


def _minutes_to_question_count(duration_minutes: int) -> int:
    return max(3, duration_minutes // 6)


# Value floor -> tone, mirroring services/completion.py's own _band_for so a history
# row and its eventual completion view never disagree about how a score reads.
_HISTORY_TONE_BANDS: tuple[tuple[int, MetricTone], ...] = (
    (80, MetricTone.POSITIVE),
    (60, MetricTone.NEUTRAL),
    (40, MetricTone.CAUTION),
    (0, MetricTone.CRITICAL),
)


def _tone_for(value: int) -> MetricTone:
    return next(tone for floor, tone in _HISTORY_TONE_BANDS if value >= floor)


def _label_for(value: int, labels: tuple[str, str, str]) -> str:
    high, mid, low = labels
    if value >= 80:
        return high
    if value >= 60:
        return mid
    return low


def _build_history_metrics(content: dict[str, Any]) -> list[dict[str, Any]]:
    """Six display tiles for the history log. This is an authored simplification —
    like the AI seam's other banding logic — derived from the report's six scored
    dimensions, not an independently measured 'confidence' or 'sentiment' signal.
    Mapping is 1:1 so no dimension backs two tiles: technical -> quality,
    communication -> confidence, structure -> behavior, relevance -> accuracy,
    clarity -> vagueness (inverted), depth -> sentiment."""
    clarity = int(content["clarity"])
    communication = int(content["communication"])
    relevance = int(content["relevance"])
    return [
        {
            "key": "quality",
            "label": "Quality",
            "value": _label_for(int(content["technical"]), ("High", "Med", "Low")),
            "tone": _tone_for(int(content["technical"])),
        },
        {
            "key": "confidence",
            "label": "Confidence",
            "value": f"{communication}%",
            "tone": _tone_for(communication),
        },
        {
            "key": "behavior",
            "label": "Behavior",
            "value": _label_for(int(content["structure"]), ("Stable", "Normal", "Erratic")),
            "tone": _tone_for(int(content["structure"])),
        },
        {
            "key": "accuracy",
            "label": "Accuracy",
            "value": f"{relevance}%",
            "tone": _tone_for(relevance),
        },
        {
            "key": "vagueness",
            "label": "Vagueness",
            "value": _label_for(100 - clarity, ("Low", "Med", "High")),
            "tone": _tone_for(clarity),
        },
        {
            "key": "sentiment",
            "label": "Tone",
            "value": _label_for(int(content["depth"]), ("Calm", "Neutral", "Anxious")),
            "tone": _tone_for(int(content["depth"])),
        },
    ]


@dataclass(frozen=True)
class TurnOutcome:
    session: PracticeSession
    routing: TurnRouting | None
    next_question: Question | None


class PracticeService:
    def __init__(
        self,
        sessions: PracticeSessionRepository,
        reports: ReportRepository,
        tickets: SocketTicketRepository,
        ai: AIProvider,
        jobs: JobService,
        analysis: AnalysisRegistry,
        history: HistoryRepository,
        insights: CompletionInsightRepository,
        resumes: ResumeRepository | None = None,
        analytics: "AnalyticsService | None" = None,
    ) -> None:
        self._sessions = sessions
        self._reports = reports
        self._tickets = tickets
        self._ai = ai
        self._jobs = jobs
        self._analysis = analysis
        self._history = history
        self._insights = insights
        self._resumes = resumes
        self._analytics = analytics

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

        # Idempotent. This used to `$set` `questions` to a brand-new single-element
        # array unconditionally, so the client's 12s REST fallback firing while the
        # WebSocket `_begin` was merely slow on TTS wiped the question the candidate
        # was already answering — and their next `answer.completed` then failed with
        # "that question isn't part of this session".
        if doc.get("questions"):
            return self._to_wire(doc)

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
            return TurnOutcome(session=self._to_wire(doc), routing=None, next_question=next_q)

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
        # Only scores that have actually landed — an answer whose background analysis
        # is still in flight (services/analysis.py) is simply absent here, not faked.
        recent_scores = [
            float(a["score"]) for a in doc.get("answers", []) if a.get("score") is not None
        ][-5:]

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
            code_artifact=request.code_artifact,
        )

        routing = await self._ai.next_turn(ctx)

        # Policy enforcement: follow-up only allowed if under root limit (max 2) and within overall budget
        allow_follow_up = (
            routing.action == "follow_up"
            and routing.follow_up is not None
            and follow_ups_used_on_root < 2
            and follow_up_budget > 0
        )

        new_question: Question | None = None  # pushed onto `questions` iff not None
        next_question_obj: Question | None = None
        next_index = question_idx

        if allow_follow_up and routing.follow_up:
            follow_up_question = Question(
                id=new_id(IdPrefix.QUESTION),
                text=routing.follow_up.text,
                category=question.category,
                topic=routing.follow_up.topic,
                difficulty=routing.follow_up.difficulty,
                follow_up=True,
            )
            new_question = follow_up_question
            next_index = len(questions)
            next_question_obj = follow_up_question
        elif roots_asked < planned_count:
            routing.action = "advance"
            routing.follow_up = None

            # Next root selection: (a) routing.next_root, (b) unasked in doc (legacy), (c) fallback_next_root
            if routing.next_root and routing.next_root.text.strip():
                new_root = Question(
                    id=new_id(IdPrefix.QUESTION),
                    text=routing.next_root.text.strip(),
                    category=routing.next_root.category or question.category,
                    topic=routing.next_root.topic or "System Architecture",
                    difficulty=routing.next_root.difficulty or config.difficulty,
                    follow_up=False,
                )
            elif question_idx + 1 < len(questions):
                # Legacy unasked question in doc
                new_root = questions[question_idx + 1]
            else:
                new_root = await self._ai.fallback_next_root(config, topics_covered, recent_scores)

            # Only push new_root if it isn't already in the session's question list
            # (the "legacy unasked question" branch above picks one that already is).
            existing_idx = next(
                (idx for idx, q in enumerate(questions) if q.id == new_root.id), None
            )
            if existing_idx is None:
                new_question = new_root
                next_index = len(questions)
            else:
                next_index = existing_idx
            next_question_obj = new_root
        else:
            # All planned roots answered
            routing.action = "advance"
            routing.follow_up = None
            next_question_obj = None

        answer = SessionAnswer(
            question_id=request.question_id,
            question=question.text,
            transcript=request.transcript,
            duration_seconds=max(1, round(request.duration_ms / 1000)),
            pause_markers_ms=request.pause_markers_ms or [],
            analysis_status=AnswerAnalysisStatus.PENDING,
            follow_up=bool(question.follow_up),
        )

        log_entries_to_push = [
            InterviewerLogEntry(
                speaker="candidate",
                kind="answer",
                text=request.transcript,
                question_id=request.question_id,
            ).model_dump(),
            InterviewerLogEntry(
                speaker="interviewer",
                kind="transition",
                text=routing.transition,
                question_id=request.question_id,
            ).model_dump(),
        ]

        updated = await self._sessions.append_turn(
            user_id,
            session_id,
            answer=answer.model_dump(),
            new_question=new_question.model_dump() if new_question else None,
            current_question_index=next_index,
            log_entries=log_entries_to_push,
        )
        assert updated is not None
        wire_session = self._to_wire(updated)

        # Scored in the background — the candidate already has the next question.
        self._analysis.schedule(
            session_id,
            self.analyze_and_store(
                user_id, session_id, question, request.transcript, request.code_artifact
            ),
        )

        return TurnOutcome(session=wire_session, routing=routing, next_question=next_question_obj)

    async def analyze_and_store(
        self,
        user_id: str,
        session_id: str,
        question: Question,
        transcript: str,
        code_artifact: dict[str, Any] | None,
    ) -> None:
        """Background scoring/behavioural analysis for one already-answered question —
        runs after `next_turn` already let the candidate move on to the next question.
        Scheduled by the realtime layer via services/analysis.py's AnalysisRegistry."""
        doc = await self._require_session(user_id, session_id)
        config = PracticeConfig(**doc["config"])

        if config.resume_id and self._resumes:
            resume_doc = await self._resumes.get_by_id(user_id, config.resume_id)
        elif self._resumes:
            resume_doc = await self._resumes.get_current_for_user(user_id)
        else:
            resume_doc = None

        ctx = AnswerAnalysisContext(
            config=config,
            question=question,
            transcript=transcript,
            resume_context=resume_doc,
            code_artifact=code_artifact,
        )

        try:
            analysis = await self._ai.analyze_answer(ctx)
        except Exception:
            logger.exception(
                "analyze_answer failed for session=%s question=%s", session_id, question.id
            )
            await self._sessions.set_answer_analysis(
                user_id,
                session_id,
                question.id,
                {"analysis_status": AnswerAnalysisStatus.FAILED},
            )
            return

        await self._sessions.set_answer_analysis(
            user_id,
            session_id,
            question.id,
            {
                "score": analysis.score,
                "strengths": analysis.strengths,
                "missing": analysis.missing,
                "reasoning": analysis.reasoning,
                "difficulty_signal": analysis.difficulty_signal,
                "analysis_status": AnswerAnalysisStatus.COMPLETE,
            },
        )

    async def submit_answer(
        self, user_id: str, session_id: str, request: AnswerCompletedRequest
    ) -> PracticeSession:
        outcome = await self.submit_answer_turn(user_id, session_id, request)
        return outcome.session

    async def generate_and_log_wrap_up(self, user_id: str, session_id: str) -> str:
        """Generates the interviewer's spoken closing line and persists it immediately
        — deliberately its own step, callable before the heavier drain/report work
        below, so the candidate hears it right away instead of only once analysis
        finishes. Idempotent: reuses whatever's already logged rather than generating
        (and speaking) a second, different closing line."""
        doc = await self._require_session(user_id, session_id)
        existing = next(
            (e for e in doc.get("interviewer_log", []) if e.get("kind") == "wrap_up"), None
        )
        if existing:
            return str(existing["text"])

        config = PracticeConfig(**doc["config"])
        answers = [SessionAnswer(**a) for a in doc.get("answers", [])]
        log = [InterviewerLogEntry(**entry) for entry in doc.get("interviewer_log", [])]

        wrap_up_line = await self._ai.generate_wrap_up(config, answers, log)
        wrap_up_entry = InterviewerLogEntry(
            speaker="interviewer", kind="wrap_up", text=wrap_up_line
        ).model_dump()
        await self._sessions.update(
            user_id,
            session_id,
            {"interviewer_log": [*doc.get("interviewer_log", []), wrap_up_entry]},
        )
        return wrap_up_line

    async def wait_for_analysis(
        self,
        session_id: str,
        on_progress: Callable[[int, int], Awaitable[None]] | None = None,
    ) -> None:
        """The "wait for all analyses to complete" step — every answer's background
        scoring pass (scheduled from submit_answer_turn) finishes before the report is
        generated, so `finalize_report` never reads a partially-scored session."""
        await self._analysis.drain(session_id, on_progress=on_progress)

    async def finalize_report(
        self, user_id: str, session_id: str, job_id: str | None = None
    ) -> ReportJobHandle:
        """Synthesizes the final report from already-scored answers and persists it.
        Assumes `wait_for_analysis` and `generate_and_log_wrap_up` already ran —
        `complete_session` below runs all three in order for a caller that doesn't
        need progress in between.

        Idempotent and safe to call concurrently: see `_finalize_lock`."""
        async with _finalize_lock(session_id):
            try:
                return await self._finalize_report_locked(user_id, session_id, job_id)
            finally:
                _finalize_locks.pop(session_id, None)

    async def _finalize_report_locked(
        self, user_id: str, session_id: str, job_id: str | None
    ) -> ReportJobHandle:
        existing_report = await self._reports.get_by_session_id(user_id, session_id)
        if existing_report:
            return ReportJobHandle(
                job_id=f"job-{existing_report['id']}",
                type=JobType.REPORT_GENERATION,
                session_id=session_id,
            )

        doc = await self._require_session(user_id, session_id)
        config = PracticeConfig(**doc["config"])
        answers = [SessionAnswer(**a) for a in doc.get("answers", [])]
        log = [InterviewerLogEntry(**entry) for entry in doc.get("interviewer_log", [])]

        content = await self._ai.generate_report(config, answers, interviewer_log=log)

        # How much of this report is actually backed by a scored answer. The
        # completion view says so out loud rather than letting a report built from
        # two scores out of five read exactly like a clean one.
        measured = scored_answers(answers)
        content["scored_answer_count"] = len(measured)
        content["unscored_answer_count"] = len(answers) - len(measured)
        if content["unscored_answer_count"]:
            logger.warning(
                "Report for session %s covers %d of %d answers — %d could not be scored.",
                session_id,
                len(measured),
                len(answers),
                content["unscored_answer_count"],
            )

        report_doc = {
            "id": new_id(IdPrefix.REPORT),
            "session_id": session_id,
            "user_id": user_id,
            "created_at": utcnow(),
            **content,
        }
        try:
            await self._reports.insert(report_doc)
        except DuplicateKeyError:
            # Another worker finalized the same session first. Its report is the
            # canonical one — return that rather than surfacing a 500.
            winner = await self._reports.get_by_session_id(user_id, session_id)
            if winner is None:
                raise
            logger.info(
                "Concurrent finalize for session %s; returning existing report %s",
                session_id,
                winner["id"],
            )
            return ReportJobHandle(
                job_id=f"job-{winner['id']}",
                type=JobType.REPORT_GENERATION,
                session_id=session_id,
            )

        await self._sessions.update(user_id, session_id, {"state": SessionState.COMPLETED})
        await self._persist_history_and_insight(user_id, doc, config, content, report_doc)

        handle = await self._jobs.create(
            user_id, JobType.REPORT_GENERATION, report_doc["id"], job_id=job_id
        )
        return ReportJobHandle(job_id=handle.job_id, type=handle.type, session_id=session_id)

    async def _persist_history_and_insight(
        self,
        user_id: str,
        doc: dict[str, Any],
        config: PracticeConfig,
        content: dict[str, Any],
        report_doc: dict[str, Any],
    ) -> None:
        """Writes the two records CompletionService reads at completion-page time.
        Without these, a live-finished session never shows up in `/history` and its
        overall-score delta against the previous session always reads 0 (see
        services/completion.py's `_delta_from_previous`). Also caches the authored
        insight (band/caption/protocols) so a completion-page load never
        re-derives it with an extra LLM call."""
        insight = await self._ai.generate_completion_insights(config, content)
        await self._insights.insert({"id": report_doc["id"], "user_id": user_id, **insight})

        # Derived from the report id alone. This used to append a letter cycling on
        # `len(existing_rows) % 26`, read *before* the insert — so it repeated every
        # 26 sessions and two concurrent completions produced the same code, on a
        # field that is user-facing and not uniquely indexed.
        code = _history_code(report_doc["id"])

        await self._history.insert(
            {
                "id": new_id(IdPrefix.HISTORY),
                "user_id": user_id,
                "code": code,
                "company": config.company,
                "role": config.role,
                "mode": f"{config.type.value.replace('_', ' ').capitalize()} mock",
                "started_at": doc.get("started_at") or utcnow(),
                "duration_minutes": config.duration,
                "score": int(content["overall"]),
                "status": HistoryStatus.COMPLETED,
                "report_id": report_doc["id"],
                "metrics": _build_history_metrics(content),
            }
        )

        # The analytics overview is a projection of exactly the records written
        # above, so it is rebuilt here rather than drifting until someone reseeds.
        if self._analytics:
            await self._analytics.recompute(user_id)

    async def complete_session(
        self,
        user_id: str,
        session_id: str,
        on_analysis_progress: Callable[[int, int], Awaitable[None]] | None = None,
        job_id: str | None = None,
    ) -> ReportJobHandle:
        """Runs `wait_for_analysis` -> `generate_and_log_wrap_up` -> `finalize_report`
        in sequence — for a caller (the plain REST endpoint) that just wants the final
        handle. The realtime layer calls the three steps itself instead, so it can
        speak the wrap-up line and stream real progress between them — see
        realtime/connection.py's `_finish`."""
        existing_report = await self._reports.get_by_session_id(user_id, session_id)
        if existing_report:
            return ReportJobHandle(
                job_id=f"job-{existing_report['id']}",
                type=JobType.REPORT_GENERATION,
                session_id=session_id,
            )

        await self.wait_for_analysis(session_id, on_progress=on_analysis_progress)
        await self.generate_and_log_wrap_up(user_id, session_id)
        return await self.finalize_report(user_id, session_id, job_id=job_id)

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

    async def get_session_section(self, user_id: str, session_id: str) -> SessionState:
        doc = await self._require_session(user_id, session_id)
        return SessionState(doc["state"])

    async def set_session_section(
        self, user_id: str, session_id: str, state: SessionState
    ) -> None:
        await self._sessions.update(user_id, session_id, {"state": state})

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
        return SocketTicket(ticket=str(doc["id"]), expires_at=expires_at)

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
