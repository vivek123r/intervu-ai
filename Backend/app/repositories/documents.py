from typing import Any

from app.repositories.base import BaseRepository


class ResumeRepository(BaseRepository):
    collection_name = "resumes"

    async def get_current_for_user(self, user_id: str) -> dict[str, Any] | None:
        docs = await self._find_list({"user_id": user_id}, sort=[("uploaded_at", -1)])
        return docs[0] if docs else None

    async def insert(self, doc: dict[str, Any]) -> None:
        await self._collection.insert_one(self._to_doc(doc))

    async def delete(self, user_id: str, resume_id: str) -> bool:
        result = await self._collection.delete_one({"_id": resume_id, "user_id": user_id})
        return result.deleted_count > 0


class JobDescriptionRepository(BaseRepository):
    collection_name = "job_descriptions"

    async def get_by_id(self, user_id: str, jd_id: str) -> dict[str, Any] | None:
        return self._from_doc(
            await self._collection.find_one({"_id": jd_id, "user_id": user_id})
        )

    async def get_latest_for_interview(self, interview_id: str) -> dict[str, Any] | None:
        docs = await self._find_list({"interview_id": interview_id}, sort=[("created_at", -1)])
        return docs[0] if docs else None

    async def insert(self, doc: dict[str, Any]) -> None:
        await self._collection.insert_one(self._to_doc(doc))
