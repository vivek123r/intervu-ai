from fastapi import APIRouter, Query, WebSocket

from app.dependencies import PracticeServiceDep, SettingsDep, SocketTicketRepositoryDep
from app.realtime.connection import SessionConnection

router = APIRouter()

ORIGIN_MISMATCH_CLOSE_CODE = 4403
INVALID_TICKET_CLOSE_CODE = 4401


@router.websocket("/ws/interviews/{session_id}")
async def interview_websocket(
    websocket: WebSocket,
    session_id: str,
    tickets: SocketTicketRepositoryDep,
    practice: PracticeServiceDep,
    settings: SettingsDep,
    ticket: str = Query(...),
) -> None:
    # CORSMiddleware doesn't apply to WebSocket upgrades — check Origin manually.
    origin = websocket.headers.get("origin")
    if origin is not None and origin != settings.web_origin:
        await websocket.close(code=ORIGIN_MISMATCH_CLOSE_CODE)
        return

    ticket_doc = await tickets.get_valid(ticket, session_id)
    if ticket_doc is None:
        await websocket.close(code=INVALID_TICKET_CLOSE_CODE)
        return

    connection = SessionConnection(websocket, session_id, ticket_doc["user_id"], practice)
    await connection.run()
