from typing import Any

from pymongo import ReturnDocument

from app.repositories.base import BaseRepository


class NotificationRepository(BaseRepository):
    collection_name = "notifications"

    async def list_for_user(self, user_id: str) -> list[dict[str, Any]]:
        return await self._find_list({"user_id": user_id}, sort=[("created_at", -1)])

    async def mark_read(self, user_id: str, notification_id: str) -> dict[str, Any] | None:
        doc = await self._collection.find_one_and_update(
            {"_id": notification_id, "user_id": user_id},
            {"$set": {"read": True}},
            return_document=ReturnDocument.AFTER,
        )
        return self._from_doc(doc)
