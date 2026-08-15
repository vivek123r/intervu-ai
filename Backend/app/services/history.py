from app.errors.codes import ErrorCode
from app.errors.exceptions import NotFoundError
from app.repositories.history import HistoryRepository
from app.schemas.history import HistorySession

_NOT_FOUND_MESSAGE = "That session is no longer in your history."


class HistoryService:
    def __init__(self, history: HistoryRepository) -> None:
        self._history = history

    async def list_for_user(self, user_id: str) -> list[HistorySession]:
        docs = await self._history.list_for_user(user_id)
        return [HistorySession(**doc) for doc in docs]

    async def delete(self, user_id: str, entry_id: str) -> None:
        deleted = await self._history.delete(user_id, entry_id)
        if not deleted:
            raise NotFoundError(ErrorCode.HISTORY_SESSION_NOT_FOUND, _NOT_FOUND_MESSAGE)
