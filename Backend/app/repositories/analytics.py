from typing import Any

from app.repositories.base import BaseRepository


class AnalyticsRepository(BaseRepository):
    collection_name = "analytics_overviews"

    async def get(self, user_id: str) -> dict[str, Any] | None:
        return self._from_doc(await self._collection.find_one({"_id": user_id}))

    async def upsert(self, user_id: str, doc: dict[str, Any]) -> None:
        """Replaces a user's derived overview wholesale — it is a pure projection of
        their reports, sessions and history, so there is nothing to merge."""
        await self._collection.update_one(
            {"_id": user_id},
            {"$set": {**doc, "user_id": user_id}},
            upsert=True,
        )
