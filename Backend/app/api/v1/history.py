from fastapi import APIRouter, Response

from app.dependencies import CurrentUser, HistoryServiceDep
from app.schemas.history import HistorySession

router = APIRouter(tags=["history"])


@router.get("/history/sessions", response_model=list[HistorySession])
async def list_history_sessions(
    current_user: CurrentUser, history: HistoryServiceDep
) -> list[HistorySession]:
    return await history.list_for_user(current_user.id)


@router.delete("/history/sessions/{entry_id}", status_code=204, response_class=Response)
async def delete_history_session(
    entry_id: str, current_user: CurrentUser, history: HistoryServiceDep
) -> Response:
    await history.delete(current_user.id, entry_id)
    return Response(status_code=204)
