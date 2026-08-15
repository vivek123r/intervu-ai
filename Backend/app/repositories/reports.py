from typing import Any

from app.repositories.base import BaseRepository


class ReportRepository(BaseRepository):
    collection_name = "reports"

    async def get_by_id(self, user_id: str, report_id: str) -> dict[str, Any] | None:
        return self._from_doc(
            await self._collection.find_one({"_id": report_id, "user_id": user_id})
        )

    async def get_by_session_id(self, user_id: str, session_id: str) -> dict[str, Any] | None:
        return self._from_doc(
            await self._collection.find_one({"session_id": session_id, "user_id": user_id})
        )

    async def insert(self, doc: dict[str, Any]) -> None:
        await self._collection.insert_one(self._to_doc(doc))
