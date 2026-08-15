from typing import Any

from app.repositories.base import BaseRepository


class HistoryRepository(BaseRepository):
    collection_name = "interview_history"

    async def list_for_user(self, user_id: str) -> list[dict[str, Any]]:
        # Newest first — the log reads top-down as a reverse chronology.
        return await self._find_list({"user_id": user_id}, sort=[("started_at", -1)])

    async def delete(self, user_id: str, entry_id: str) -> bool:
        result = await self._collection.delete_one({"_id": entry_id, "user_id": user_id})
        return result.deleted_count > 0
