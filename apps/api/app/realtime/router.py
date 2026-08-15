from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError
from sqlalchemy import select

from app.config import get_settings
from app.core.security import WebSocketTicketSigner
from app.db.session import SessionFactory
from app.dependencies import get_ai_orchestrator
from app.exceptions import DomainError
from app.models.user import User
from app.realtime.schemas import SocketEnvelope
from app.schemas.practice import SessionAnswerCreate
from app.services.practice import PracticeService

router = APIRouter()


async def send(websocket: WebSocket, event_type: str, payload: dict[str, object]) -> None:
    envelope = SocketEnvelope(type=event_type, payload=payload)
    await websocket.send_json(envelope.model_dump(mode="json"))


@router.websocket("/ws/interviews/{session_id}")
async def interview_socket(websocket: WebSocket, session_id: UUID, ticket: str) -> None:
    signer = WebSocketTicketSigner(get_settings().oauth_state_secret)
    try:
        claims = signer.read(ticket)
        if claims["session_id"] != str(session_id):
            raise ValueError("Session mismatch")
        user_id = UUID(claims["user_id"])
    except Exception:
        await websocket.close(code=4401, reason="Invalid or expired connection ticket")
        return
    await websocket.accept()
    async with SessionFactory() as session:
        user = await session.scalar(select(User).where(User.id == user_id))
        if user is None:
            await websocket.close(code=4401, reason="User not found")
            return
        service = PracticeService(
            session=session, ai=get_ai_orchestrator(), settings=get_settings()
        )
        try:
            restored = await service.get(user, session_id)
            await send(websocket, "session.ready", restored.model_dump(mode="json"))
            while True:
                raw = await websocket.receive_json()
                envelope = SocketEnvelope.model_validate(raw)
                if envelope.type == "heartbeat":
                    await send(websocket, "heartbeat.ack", {})
                elif envelope.type == "session.start":
                    started = await service.start(user, session_id)
                    await send(websocket, "session.started", started.model_dump(mode="json"))
                    if started.current_question:
                        await send(
                            websocket,
                            "question.created",
                            started.current_question.model_dump(mode="json"),
                        )
                elif envelope.type == "answer.completed":
                    await send(websocket, "interviewer.thinking", {"active": True})
                    payload = SessionAnswerCreate.model_validate(envelope.payload)
                    result = await service.answer(user, session_id, payload)
                    await send(websocket, "interviewer.thinking", {"active": False})
                    await send(
                        websocket,
                        "question.created",
                        result.next_question.model_dump(mode="json")
                        if result.next_question
                        else {},
                    )
                elif envelope.type == "session.end":
                    await send(websocket, "analysis.started", {"progress": 5})
                    report = await service.complete(user, session_id)
                    await send(websocket, "analysis.completed", report.model_dump(mode="json"))
                else:
                    await send(
                        websocket,
                        "error",
                        {"code": "UNKNOWN_EVENT", "message": "That live-session event is unknown."},
                    )
        except WebSocketDisconnect:
            return
        except DomainError as exc:
            await send(websocket, "error", {"code": exc.code, "message": exc.message})
        except ValidationError:
            await send(
                websocket,
                "error",
                {"code": "INVALID_EVENT", "message": "The live-session event was invalid."},
            )
