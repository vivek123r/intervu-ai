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
        elif event_type == "answer.completed":
            await self._on_answer_completed(payload)
        elif event_type == "question.repeat":
            question_id = payload.get("questionId")
            if question_id:
                await self._send("question.started", {"questionId": question_id})
        elif event_type == "session.end":
            await self._finish()
        # answer.started / answer.partial_transcript: no scripted reaction

    async def _begin(self) -> None:
        await self._send("session.ready", {})
        session = await self._practice.start_session(self._user_id, self._session_id)

        self._questions_per_section = max(1, math.ceil(len(session.questions) / len(SECTION_ORDER)))
        await self._send("session.started", {"state": self._section.value})
        await self._send_question(session, position=1)

    async def _on_answer_completed(self, payload: dict[str, Any]) -> None:
        await self._send("interviewer.thinking", {})
        request = AnswerCompletedRequest(**payload)
        session = await self._practice.submit_answer(self._user_id, self._session_id, request)
        self._questions_asked += 1

        if self._questions_asked >= len(session.questions):
            await self._finish()
            return

        if self._questions_asked % self._questions_per_section == 0:
            previous_section = self._section
            self._section = next_section(self._section)
            await self._send(
                "section.changed", {"from": previous_section.value, "to": self._section.value}
            )
        await self._send_question(session, position=self._questions_asked + 1)

    async def _send_question(self, session: PracticeSession, position: int) -> None:
        question = session.questions[position - 1]
        await self._send(
            "question.created",
            {
                "id": question.id,
                "text": question.text,
                "topic": question.topic,
                "difficulty": question.difficulty.value,
                "isFollowUp": False,
                "position": position,
                "totalPlanned": len(session.questions),
            },
        )
        await self._send("question.started", {"questionId": question.id})

    async def _finish(self) -> None:
        await self._send(
            "interviewer.response",
            {"text": "Thanks for your time today — that wraps up the interview."},
        )
        await self._send(
            "section.changed", {"from": self._section.value, "to": SessionState.WRAP_UP.value}
        )
        await self._send("session.completed", {"reason": "completed"})

        handle = await self._practice.complete_session(self._user_id, self._session_id)
        await self._send("analysis.started", {"jobId": handle.job_id})
        await self._send(
            "analysis.progress",
            {
                "jobId": handle.job_id,
                "progress": 1.0,
                "phase": "complete",
                "message": "Analysis complete.",
            },
        )
        report = await self._practice.get_report_by_session(self._user_id, self._session_id)
        await self._send("analysis.completed", {"jobId": handle.job_id, "reportId": report.id})
