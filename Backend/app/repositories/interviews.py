from typing import Any

from app.repositories.base import BaseRepository


class InterviewRepository(BaseRepository):
    collection_name = "interviews"

    async def list_for_user(self, user_id: str) -> list[dict[str, Any]]:
        return await self._find_list({"user_id": user_id})

    async def get(self, user_id: str, interview_id: str) -> dict[str, Any] | None:
        return self._from_doc(
            await self._collection.find_one({"_id": interview_id, "user_id": user_id})
        )

    async def insert(self, doc: dict[str, Any]) -> None:
        await self._collection.insert_one(self._to_doc(doc))

    async def update(
        self, user_id: str, interview_id: str, changes: dict[str, Any]
    ) -> dict[str, Any] | None:
        if not changes:
            return await self.get(user_id, interview_id)
        await self._collection.update_one(
            {"_id": interview_id, "user_id": user_id}, {"$set": changes}
        )
        return await self.get(user_id, interview_id)

    async def delete(self, user_id: str, interview_id: str) -> bool:
        result = await self._collection.delete_one({"_id": interview_id, "user_id": user_id})
        return result.deleted_count > 0
