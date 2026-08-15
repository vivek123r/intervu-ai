from typing import Any

from app.repositories.base import BaseRepository


class PracticeSessionRepository(BaseRepository):
    collection_name = "practice_sessions"

    async def get(self, user_id: str, session_id: str) -> dict[str, Any] | None:
        return self._from_doc(
            await self._collection.find_one({"_id": session_id, "user_id": user_id})
        )

    async def insert(self, doc: dict[str, Any]) -> None:
        await self._collection.insert_one(self._to_doc(doc))

    async def update(
        self, user_id: str, session_id: str, changes: dict[str, Any]
    ) -> dict[str, Any] | None:
        await self._collection.update_one(
            {"_id": session_id, "user_id": user_id}, {"$set": changes}
        )
        return await self.get(user_id, session_id)
