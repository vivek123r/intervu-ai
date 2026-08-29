from typing import Any

from app.repositories.base import BaseRepository


class HistoryRepository(BaseRepository):
    collection_name = "interview_history"

    async def list_for_user(self, user_id: str) -> list[dict[str, Any]]:
        # Newest first — the log reads top-down as a reverse chronology.
        return await self._find_list({"user_id": user_id}, sort=[("started_at", -1)])

    async def insert(self, doc: dict[str, Any]) -> None:
        await self._collection.insert_one(self._to_doc(doc))

    async def delete(self, user_id: str, entry_id: str) -> dict[str, Any] | None:
        """Removes the row and returns it, so the caller can follow `report_id`
        into the report/session/insight/conversation records that belong to the
        same session. Returns None when nothing matched."""
        return self._from_doc(
            await self._collection.find_one_and_delete({"_id": entry_id, "user_id": user_id})
        )
