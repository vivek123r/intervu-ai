import asyncio
import math
import uuid
from typing import Any

from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect

from app.core.timeutils import to_iso_millis, utcnow
from app.schemas.common import SessionState
from app.schemas.practice import AnswerCompletedRequest, PracticeSession
from app.services.practice import PracticeService
from app.services.session_state import SECTION_ORDER, next_section


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
        self._questions_asked = 0
        self._pending_question: tuple[PracticeSession, int] | None = None
        self._speech_timeout_task: asyncio.Task[None] | None = None
        self._user_speaking = False

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
                await self._handle(data)
        except WebSocketDisconnect:
            pass
        finally:
            if self._speech_timeout_task and not self._speech_timeout_task.done():
                self._speech_timeout_task.cancel()
            await self._outbox.put(None)

    async def _send(self, event_type: str, payload: dict[str, Any]) -> None:
        await self._outbox.put(envelope(event_type, payload))

    async def _handle(self, data: dict[str, Any]) -> None:
        event_type = data.get("type")
        payload = data.get("payload") or {}

        if event_type == "heartbeat":
            await self._send("heartbeat.ack", {})
        elif event_type == "session.start":
            await self._begin()
        elif event_type == "session.resume":
            await self._resume()
        elif event_type == "speech.completed":
            await self._on_speech_completed()
        elif event_type == "answer.started":
            self._user_speaking = True
        elif event_type == "answer.completed":
            self._user_speaking = False
            await self._on_answer_completed(payload)
        elif event_type == "question.repeat":
            question_id = payload.get("questionId")
            if question_id:
                await self._send("question.started", {"questionId": question_id})
        elif event_type == "session.end":
            await self._finish()

    async def _begin(self) -> None:
        session = await self._practice.get_session(self._user_id, self._session_id)
        # If session is already initialized with questions and answers, resume
        if session.answers and len(session.answers) > 0:
            await self._resume()
            return

        await self._send("session.ready", {})
        session = await self._practice.start_session(self._user_id, self._session_id)

        planned = session.planned_question_count or len(session.questions)
        self._questions_per_section = max(1, math.ceil(planned / len(SECTION_ORDER)))
        await self._send("session.started", {"state": self._section.value})

        intro_entry = next((e for e in session.interviewer_log if e.kind == "intro"), None)
        if intro_entry:
            await self._send("interviewer.response", {"text": intro_entry.text, "kind": "intro"})
            # Hold question until intro speech completes
            self._pending_question = (session, 1)
            self._speech_timeout_task = asyncio.create_task(self._speech_timeout(20.0))
        else:
            await self._send_question(session, position=1)

    async def _resume(self) -> None:
        session = await self._practice.get_session(self._user_id, self._session_id)
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
        if self._speech_timeout_task and not self._speech_timeout_task.done():
            self._speech_timeout_task.cancel()
            self._speech_timeout_task = None

        if self._pending_question is not None:
            session, pos = self._pending_question
            self._pending_question = None
            await self._send_question(session, position=pos)

    async def _speech_timeout(self, seconds: float = 20.0) -> None:
        try:
            await asyncio.sleep(seconds)
            if self._pending_question is not None:
                await self._send(
                    "session.warning",
                    {
                        "code": "speech_ack_timeout",
                        "message": "Speech playback acknowledgement timed out.",
                    },
                )
                session, pos = self._pending_question
                self._pending_question = None
                await self._send_question(session, position=pos)
        except asyncio.CancelledError:
            pass

    async def _on_answer_completed(self, payload: dict[str, Any]) -> None:
        request = AnswerCompletedRequest(**payload)
        current_session = await self._practice.get_session(self._user_id, self._session_id)
        if any(a.question_id == request.question_id for a in current_session.answers):
            return

        await self._send("interviewer.thinking", {})
        outcome = await self._practice.submit_answer_turn(self._user_id, self._session_id, request)

        # Idempotency guard: ignore duplicate submits
        if outcome.decision is None:
            return

        session = outcome.session

        # Emit spoken transition
        await self._send(
            "interviewer.response",
            {"text": outcome.decision.transition, "kind": "transition"},
        )

        if outcome.next_question is None:
            # Complete session after wrap up
            self._pending_question = None
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
                await self._send(
                    "section.changed", {"from": previous_section.value, "to": self._section.value}
                )

        # Buffer next question to be delivered after client reports transition speech finished
        self._pending_question = (session, pos)
        if self._speech_timeout_task and not self._speech_timeout_task.done():
            self._speech_timeout_task.cancel()
        self._speech_timeout_task = asyncio.create_task(self._speech_timeout(20.0))

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
        if self._speech_timeout_task and not self._speech_timeout_task.done():
            self._speech_timeout_task.cancel()
            self._speech_timeout_task = None
        handle = await self._practice.complete_session(self._user_id, self._session_id)
        session = await self._practice.get_session(self._user_id, self._session_id)

        wrap_up_entry = next(
            (e for e in reversed(session.interviewer_log) if e.kind == "wrap_up"), None
        )
        wrap_up_text = (
            wrap_up_entry.text
            if wrap_up_entry
            else "Thanks for your time today — that wraps up the interview."
        )

        await self._send(
            "interviewer.response",
            {"text": wrap_up_text, "kind": "wrap_up"},
        )
        await self._send(
            "section.changed", {"from": self._section.value, "to": SessionState.WRAP_UP.value}
        )
        await self._send("session.completed", {"reason": "completed"})

        await self._send("analysis.started", {"jobId": handle.job_id})

        phases = [
            (0.3, "transcript", "Processing transcript & speech patterns…"),
            (0.6, "technical", "Evaluating technical depth & trade-offs…"),
            (0.85, "communication", "Synthesizing communication metrics…"),
            (1.0, "recommendations", "Generating prioritized growth protocols…"),
        ]
        for progress, phase, message in phases:
            await asyncio.sleep(0.3)
            await self._send(
                "analysis.progress",
                {
                    "jobId": handle.job_id,
                    "progress": progress,
                    "phase": phase,
                    "message": message,
                },
            )

        report = await self._practice.get_report_by_session(self._user_id, self._session_id)
        await self._send("analysis.completed", {"jobId": handle.job_id, "reportId": report.id})
