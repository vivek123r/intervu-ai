from typing import Any

from app.repositories.base import BaseRepository


class JobRepository(BaseRepository):
    collection_name = "jobs"

    async def get(self, user_id: str, job_id: str) -> dict[str, Any] | None:
        return self._from_doc(await self._collection.find_one({"_id": job_id, "user_id": user_id}))

    async def insert(self, doc: dict[str, Any]) -> None:
        await self._collection.insert_one(self._to_doc(doc))
