from typing import Any

from app.repositories.base import BaseRepository


class AnalyticsRepository(BaseRepository):
    collection_name = "analytics_overviews"

    async def get(self, user_id: str) -> dict[str, Any] | None:
        return self._from_doc(await self._collection.find_one({"_id": user_id}))
