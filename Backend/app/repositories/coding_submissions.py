from typing import Any

from app.repositories.base import BaseRepository
from app.schemas.common import SubmissionStatus


class CodingSubmissionRepository(BaseRepository):
    collection_name = "coding_submissions"

    async def create(self, doc: dict[str, Any]) -> None:
        await self._collection.insert_one(self._to_doc(doc))

    async def get(self, user_id: str, submission_id: str) -> dict[str, Any] | None:
        return self._from_doc(
            await self._collection.find_one({"_id": submission_id, "user_id": user_id})
        )

    async def update(self, submission_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
        await self._collection.update_one({"_id": submission_id}, {"$set": updates})
        return self._from_doc(await self._collection.find_one({"_id": submission_id}))

    async def list_by_problem(
        self, user_id: str, problem_slug: str, limit: int = 50
    ) -> list[dict[str, Any]]:
        cursor = (
            self._collection.find({"user_id": user_id, "problem_slug": problem_slug})
            .sort("created_at", -1)
            .limit(limit)
        )
        return self._from_docs(await cursor.to_list(length=limit))

    async def list_by_user(self, user_id: str, limit: int = 20) -> list[dict[str, Any]]:
        cursor = self._collection.find({"user_id": user_id}).sort("created_at", -1).limit(limit)
        return self._from_docs(await cursor.to_list(length=limit))

    async def get_user_problem_statuses(self, user_id: str) -> dict[str, str]:
        pipeline: list[dict[str, Any]] = [
            {"$match": {"user_id": user_id}},
            {
                "$group": {
                    "_id": "$problem_slug",
                    "has_accepted": {
                        "$max": {
                            "$cond": [{"$eq": ["$status", SubmissionStatus.ACCEPTED.value]}, 1, 0]
                        }
                    },
                }
            },
        ]
        results = await self._collection.aggregate(pipeline).to_list(length=None)
        statuses: dict[str, str] = {}
        for r in results:
            slug = r["_id"]
            if r.get("has_accepted") == 1:
                statuses[slug] = "solved"
            else:
                statuses[slug] = "attempted"
        return statuses

    async def get_user_solved_slugs(self, user_id: str) -> set[str]:
        slugs = await self._collection.distinct(
            "problem_slug", {"user_id": user_id, "status": SubmissionStatus.ACCEPTED.value}
        )
        return set(slugs)

    async def get_acceptance_rates(self) -> dict[str, float]:
        pipeline: list[dict[str, Any]] = [
            {
                "$group": {
                    "_id": "$problem_slug",
                    "total": {"$sum": 1},
                    "accepted": {
                        "$sum": {
                            "$cond": [{"$eq": ["$status", SubmissionStatus.ACCEPTED.value]}, 1, 0]
                        }
                    },
                }
            }
        ]
        results = await self._collection.aggregate(pipeline).to_list(length=None)
        rates: dict[str, float] = {}
        for r in results:
            total = r.get("total", 0)
            accepted = r.get("accepted", 0)
            rates[r["_id"]] = round((accepted / total) * 100.0, 1) if total > 0 else 0.0
        return rates
