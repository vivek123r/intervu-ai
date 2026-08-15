from typing import Any

from app.repositories.base import BaseRepository


class CalendarConnectionRepository(BaseRepository):
    collection_name = "calendar_connections"

    async def get(self, user_id: str) -> dict[str, Any] | None:
        return self._from_doc(await self._collection.find_one({"_id": user_id}))

    async def upsert(self, user_id: str, state: dict[str, Any]) -> None:
        payload = self._to_doc({**state, "id": user_id, "user_id": user_id})
        await self._collection.replace_one({"_id": user_id}, payload, upsert=True)
