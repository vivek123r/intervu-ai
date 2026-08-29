import asyncio
import contextlib
import logging
import math
import uuid
from typing import Any

from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect

from app.core.timeutils import to_iso_millis, utcnow
from app.errors.codes import ErrorCode
from app.schemas.common import SessionState
from app.schemas.practice import AnswerCompletedRequest, PracticeSession
from app.services.practice import PracticeService
from app.services.session_state import SECTION_ORDER, next_section

logger = logging.getLogger(__name__)

SPEECH_ACK_TIMEOUT_SECONDS = 8.0


def envelope(event_type: str, payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": event_type,
        "payload": payload,
        "sentAt": to_iso_millis(utcnow()),
        "requestId": str(uuid.uuid4()),
    }


class SessionConnection:
    """Drives one WebSocket connection for a practice session.

    Two tasks, not one loop: a single `while True: receive_json()` loop can never
    push a timed server event (question.created, interviewer.thinking) because it's
    always blocked waiting on the client. A receive task and a single writer task
    draining a queue let the server push on its own schedule, and the single writer
    prevents two server-originated events (e.g. heartbeat.ack racing a scripted
    event) from interleaving into a corrupted frame order.
    """

    def __init__(
        self, websocket: WebSocket, session_id: str, user_id: str, practice: PracticeService
    ) -> None:
        self._ws = websocket
        self._session_id = session_id
        self._user_id = user_id
        self._practice = practice
        self._outbox: asyncio.Queue[dict[str, Any] | None] = asyncio.Queue()
        self._section = SECTION_ORDER[0]
        self._questions_per_section = 1
        self._user_speaking = False
        self._speech_gate = asyncio.Event()
        # True only while `_speak()` is actually waiting on an ack — guards against
        # a stray or late `speech.completed` (e.g. from `question.repeat`, or one
        # that arrives just after this gate's own timeout) opening the *next*
        # gate early and causing the next line's TTS to overlap this one's.
        self._speak_pending = False
        # Serializes the slow, turn-level handlers (session.start/resume,
        # answer.completed, session.end) against each other so two can never
        # interleave — see _dispatch.
        self._turn_lock = asyncio.Lock()
        self._background_tasks: set[asyncio.Task[None]] = set()

    async def run(self) -> None:
        await self._ws.accept()
        async with asyncio.TaskGroup() as tg:
            tg.create_task(self._writer_loop())
            tg.create_task(self._receive_loop())

    async def _writer_loop(self) -> None:
        while True:
            message = await self._outbox.get()
            if message is None:
                return
            await self._ws.send_json(message)

    async def _receive_loop(self) -> None:
        try:
            while True:
                data = await self._ws.receive_json()
                await self._dispatch(data)
        except WebSocketDisconnect:
            pass
        finally:
            if self._background_tasks:
                await asyncio.gather(*self._background_tasks, return_exceptions=True)
            await self._outbox.put(None)

    async def _send(self, event_type: str, payload: dict[str, Any]) -> None:
        await self._outbox.put(envelope(event_type, payload))

    async def _speak(self, kind: str, text: str) -> None:
        """Sends a gated `interviewer.response` (intro/transition) and blocks until the
        client's `speech.completed` ack arrives, or a safety timeout elapses — the
        Speech-Caption Gating Protocol in API-CONTRACT.md. Without this, the next
        question is dispatched immediately and its own TTS collides with this line's.
        """
        self._speech_gate.clear()
        self._speak_pending = True
        try:
            await self._send("interviewer.response", {"text": text, "kind": kind})
            with contextlib.suppress(TimeoutError):
                await asyncio.wait_for(
                    self._speech_gate.wait(), timeout=SPEECH_ACK_TIMEOUT_SECONDS
                )
        finally:
            self._speak_pending = False

    async def _dispatch(self, data: dict[str, Any]) -> None:
        """Runs the fast, near-instant events inline; hands anything that might do a
        multi-second LLM call to a tracked background task instead, so the receive
        loop returns immediately to `receive_json()` and keeps acking heartbeats and
        speech-completion acks — see `_run_turn` for why those still can't interleave.
        """
        event_type = data.get("type")
        payload = data.get("payload") or {}

        if event_type == "heartbeat":
            await self._send("heartbeat.ack", {})
            return
        if event_type == "speech.completed":
            await self._on_speech_completed()
            return
        if event_type == "answer.started":
            self._user_speaking = True
            return
        if event_type == "question.repeat":
            question_id = payload.get("questionId")
            if question_id:
                await self._send("question.started", {"questionId": question_id})
            return

        if event_type in ("session.start", "session.resume", "answer.completed", "session.end"):
            task = asyncio.create_task(self._run_turn(event_type, payload))
            self._background_tasks.add(task)
            task.add_done_callback(self._background_tasks.discard)

    async def _run_turn(self, event_type: str, payload: dict[str, Any]) -> None:
        async with self._turn_lock:
            try:
                if event_type == "session.start":
                    await self._begin()
                elif event_type == "session.resume":
                    await self._resume()
                elif event_type == "answer.completed":
                    self._user_speaking = False
                    await self._on_answer_completed(payload)
                elif event_type == "session.end":
                    await self._finish()
            except Exception as exc:
                logger.exception("Unhandled error processing %s", event_type)
                await self._send_error(
                    ErrorCode.REQUEST_FAILED, str(exc) or "Something went wrong processing that."
                )

    async def _send_error(self, code: ErrorCode, message: str) -> None:
        await self._send(
            "error", {"code": code, "message": message, "details": {}, "requestId": None}
        )

    async def _begin(self) -> None:
        session = await self._practice.get_session(self._user_id, self._session_id)
        # If session is already initialized with questions, resume cleanly
        if session.questions and len(session.questions) > 0:
            await self._resume()
            return

        await self._send("session.ready", {})
        session = await self._practice.start_session(self._user_id, self._session_id)

        planned = session.planned_question_count or len(session.questions)
        self._questions_per_section = max(1, math.ceil(planned / len(SECTION_ORDER)))
        await self._send("session.started", {"state": self._section.value})

        intro_entry = next((e for e in session.interviewer_log if e.kind == "intro"), None)
        if intro_entry:
            await self._speak("intro", intro_entry.text)

        # Question 1 waits for the intro's speech.completed ack (or its timeout) above,
        # so its own TTS never overlaps the greeting's.
        await self._send_question(session, position=1)

    async def _resume(self) -> None:
        session = await self._practice.get_session(self._user_id, self._session_id)
        persisted_section = await self._practice.get_session_section(
            self._user_id, self._session_id
        )
        self._section = (
            persisted_section if persisted_section in SECTION_ORDER else SECTION_ORDER[0]
        )
        planned = session.planned_question_count or len(session.questions)
        self._questions_per_section = max(1, math.ceil(planned / len(SECTION_ORDER)))

        await self._send("session.ready", {})
        await self._send("session.started", {"state": self._section.value})

        pos = min(session.current_question_index + 1, len(session.questions))
        if pos > 0 and pos <= len(session.questions):
            await self._send_question(session, position=pos)
        elif len(session.answers) >= planned:
            await self._finish()

    async def _on_speech_completed(self) -> None:
        # Ignore acks that arrive when nothing is actually gated — a stray ack
        # (e.g. from `question.repeat`) must not open the *next* `_speak()` call's
        # gate before its own line has even been sent.
        if self._speak_pending:
            self._speech_gate.set()

    async def _on_answer_completed(self, payload: dict[str, Any]) -> None:
        request = AnswerCompletedRequest(**payload)
        current_session = await self._practice.get_session(self._user_id, self._session_id)
        if any(a.question_id == request.question_id for a in current_session.answers):
            # Without this, the client's local `interviewerState = "thinking"` (set the
            # instant it sent answer.completed) never gets unstuck — nothing else was
            # ever going to arrive for this submit.
            await self._send_error(
                ErrorCode.DUPLICATE_ANSWER, "That answer was already recorded."
            )
            return

        await self._send("interviewer.thinking", {})
        outcome = await self._practice.submit_answer_turn(self._user_id, self._session_id, request)

        # Idempotency guard: ignore duplicate submits
        if outcome.routing is None:
            await self._send_error(
                ErrorCode.DUPLICATE_ANSWER, "That answer was already recorded."
            )
            return

        session = outcome.session

        # Emit spoken transition; gated so the next question's TTS doesn't overlap it.
        # The answer's score/strengths/missing are already being computed in the
        # background (services/analysis.py) — nothing here waits on that.
        await self._speak("transition", outcome.routing.transition)

        if outcome.next_question is None:
            # Complete session after wrap up
            await self._finish()
            return

        # Find position of next question in session
        next_q = outcome.next_question
        pos = next(idx for idx, q in enumerate(session.questions) if q.id == next_q.id) + 1

        # Section pacing check on roots answered
        if not next_q.follow_up:
            roots_answered = sum(
                1
                for a in session.answers
                if not next(
                    (q.follow_up for q in session.questions if q.id == a.question_id), False
                )
            )
            if roots_answered > 0 and roots_answered % self._questions_per_section == 0:
                previous_section = self._section
                self._section = next_section(self._section)
                await self._practice.set_session_section(
                    self._user_id, self._session_id, self._section
                )
                await self._send(
                    "section.changed", {"from": previous_section.value, "to": self._section.value}
                )

        # Synchronously deliver the next question immediately with zero dead air
        await self._send_question(session, position=pos)

    async def _send_question(self, session: PracticeSession, position: int) -> None:
        if position < 1 or position > len(session.questions):
            return
        question = session.questions[position - 1]
        planned = session.planned_question_count or len(session.questions)
        # Root ordinal (number of root questions up to this point)
        root_ordinal = sum(1 for q in session.questions[:position] if not q.follow_up)
        await self._send(
            "question.created",
            {
                "id": question.id,
                "text": question.text,
                "topic": question.topic,
                "difficulty": question.difficulty.value,
                "isFollowUp": bool(question.follow_up),
                "position": root_ordinal,
                "totalPlanned": planned,
            },
        )
        await self._send("question.started", {"questionId": question.id})

    async def _finish(self) -> None:
        # Spoken immediately — deliberately not gated behind the analysis below, so
        # the candidate hears it the moment the interview ends rather than only once
        # every answer has been scored and the report exists.
        wrap_up_text = await self._practice.generate_and_log_wrap_up(
            self._user_id, self._session_id
        )
        await self._send("interviewer.response", {"text": wrap_up_text, "kind": "wrap_up"})
        await self._send(
            "section.changed", {"from": self._section.value, "to": SessionState.WRAP_UP.value}
        )
        await self._send("session.completed", {"reason": "completed"})

        job_id = str(uuid.uuid4())
        await self._send("analysis.started", {"jobId": job_id})

        async def on_analysis_progress(completed: int, total: int) -> None:
            fraction = completed / total if total else 1.0
            await self._send(
                "analysis.progress",
                {
                    "jobId": job_id,
                    "progress": round(min(0.85, 0.1 + 0.75 * fraction), 2),
                    "phase": "transcript",
                    "message": f"Scored {completed} of {total} answers…",
                },
            )

        # The "wait for all analyses to complete" step — each event above is real:
        # it fires exactly when an answer's background scoring pass actually lands.
        await self._practice.wait_for_analysis(self._session_id, on_progress=on_analysis_progress)

        await self._send(
            "analysis.progress",
            {
                "jobId": job_id,
                "progress": 0.9,
                "phase": "recommendations",
                "message": "Generating your performance report…",
            },
        )
        handle = await self._practice.finalize_report(
            self._user_id, self._session_id, job_id=job_id
        )

        report = await self._practice.get_report_by_session(self._user_id, self._session_id)
        await self._send("analysis.completed", {"jobId": handle.job_id, "reportId": report.id})
