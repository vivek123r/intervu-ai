from typing import Any

from pymongo import ReturnDocument

from app.repositories.base import BaseRepository


class PreparationTaskRepository(BaseRepository):
    collection_name = "preparation_tasks"

    async def list_for_interview(self, interview_id: str) -> list[dict[str, Any]]:
        return await self._find_list({"interview_id": interview_id}, sort=[("day", 1)])

    async def list_due_today_for_user(self, user_id: str) -> list[dict[str, Any]]:
        return await self._find_list({"user_id": user_id, "day": 1})

    async def insert_many(self, docs: list[dict[str, Any]]) -> None:
        if docs:
            await self._collection.insert_many([self._to_doc(d) for d in docs])

    async def delete_for_interview(self, interview_id: str) -> None:
        await self._collection.delete_many({"interview_id": interview_id})

    async def update_status(
        self, user_id: str, task_id: str, status: str
    ) -> dict[str, Any] | None:
        doc = await self._collection.find_one_and_update(
            {"_id": task_id, "user_id": user_id},
            {"$set": {"status": status}},
            return_document=ReturnDocument.AFTER,
        )
        return self._from_doc(doc)


class QuestionRepository(BaseRepository):
    collection_name = "questions"

    async def list_for_interview(self, interview_id: str) -> list[dict[str, Any]]:
        return await self._find_list({"interview_id": interview_id})

    async def insert_many(self, docs: list[dict[str, Any]]) -> None:
        if docs:
            await self._collection.insert_many([self._to_doc(d) for d in docs])

    async def delete_for_interview(self, interview_id: str) -> None:
        await self._collection.delete_many({"interview_id": interview_id})


class PreparationPlanRepository(BaseRepository):
    collection_name = "preparation_plans"

    async def get(self, interview_id: str) -> dict[str, Any] | None:
        return self._from_doc(await self._collection.find_one({"_id": interview_id}))

    async def upsert(self, interview_id: str, doc: dict[str, Any]) -> None:
        payload = self._to_doc({**doc, "id": interview_id})
        await self._collection.replace_one({"_id": interview_id}, payload, upsert=True)

    async def delete(self, interview_id: str) -> None:
        await self._collection.delete_one({"_id": interview_id})
