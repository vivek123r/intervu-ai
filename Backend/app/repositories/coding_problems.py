from typing import Any

from app.repositories.base import BaseRepository
from app.schemas.common import CodingDifficulty


class CodingProblemRepository(BaseRepository):
    collection_name = "coding_problems"

    async def list_problems(
        self,
        difficulty: CodingDifficulty | None = None,
        topics: list[str] | None = None,
        search: str | None = None,
        sort_by: str = "number",
        sort_dir: int = 1,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[dict[str, Any]], int]:
        query: dict[str, Any] = {}
        if difficulty:
            query["difficulty"] = (
                difficulty.value if hasattr(difficulty, "value") else str(difficulty)
            )
        if topics:
            query["topics"] = {"$in": topics}
        if search:
            query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"slug": {"$regex": search, "$options": "i"}},
            ]
            if search.isdigit():
                query["$or"].append({"number": int(search)})

        total = await self._collection.count_documents(query)

        sort_field = "number"
        if sort_by == "title":
            sort_field = "title"
        elif sort_by == "difficulty":
            sort_field = "difficulty"
        elif sort_by == "number":
            sort_field = "number"

        cursor = self._collection.find(query).sort(sort_field, sort_dir).skip(offset).limit(limit)
        docs = await cursor.to_list(length=limit)
        return self._from_docs(docs), total

    async def get_by_slug(self, slug: str) -> dict[str, Any] | None:
        return self._from_doc(await self._collection.find_one({"slug": slug}))

    async def get_by_id(self, problem_id: str) -> dict[str, Any] | None:
        return self._from_doc(await self._collection.find_one({"_id": problem_id}))

    async def get_topics_with_counts(self) -> list[dict[str, Any]]:
        pipeline: list[dict[str, Any]] = [
            {"$unwind": "$topics"},
            {"$group": {"_id": "$topics", "count": {"$sum": 1}}},
            {"$sort": {"count": -1, "_id": 1}},
            {"$project": {"name": "$_id", "count": 1, "_id": 0}},
        ]
        return await self._collection.aggregate(pipeline).to_list(length=None)

    async def count_by_difficulty(self) -> dict[str, int]:
        pipeline: list[dict[str, Any]] = [
            {"$group": {"_id": "$difficulty", "count": {"$sum": 1}}},
        ]
        results = await self._collection.aggregate(pipeline).to_list(length=None)
        counts = {"easy": 0, "medium": 0, "hard": 0}
        for item in results:
            if item["_id"] in counts:
                counts[item["_id"]] = item["count"]
        return counts

    async def upsert(self, doc: dict[str, Any]) -> None:
        db_doc = self._to_doc(doc)
        await self._collection.update_one({"_id": db_doc["_id"]}, {"$set": db_doc}, upsert=True)
