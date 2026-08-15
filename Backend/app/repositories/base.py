from datetime import datetime
from typing import Any

from motor.motor_asyncio import AsyncIOMotorCollection

from app.core.timeutils import ensure_utc
from app.db.mongo import Doc, MongoDatabase


class BaseRepository:
    """Common `_id`/`id` translation so Mongo's `_id` never leaks past this layer.

    Subclasses set `collection_name` and add their own query methods. User-owned
    collections take `user_id` as an explicit, required parameter on every method
    rather than trusting a default — see docs/API-CONTRACT.md's ownership rule.
    """

    collection_name: str

    def __init__(self, db: MongoDatabase) -> None:
        self._collection: AsyncIOMotorCollection[Doc] = db[self.collection_name]

    @staticmethod
    def _to_doc(data: dict[str, Any]) -> dict[str, Any]:
        doc = dict(data)
        doc["_id"] = doc.pop("id")
        return doc

    @staticmethod
    def _from_doc(doc: dict[str, Any] | None) -> dict[str, Any] | None:
        if doc is None:
            return None
        doc = dict(doc)
        doc["id"] = doc.pop("_id")
        for key, value in doc.items():
            if isinstance(value, datetime):
                doc[key] = ensure_utc(value)
        return doc

    @classmethod
    def _from_docs(cls, docs: list[dict[str, Any]]) -> list[dict[str, Any]]:
        return [found for doc in docs if (found := cls._from_doc(doc)) is not None]

    async def _find_list(
        self, query: dict[str, Any], sort: list[tuple[str, int]] | None = None
    ) -> list[dict[str, Any]]:
        cursor = self._collection.find(query)
        if sort:
            cursor = cursor.sort(sort)
        return self._from_docs(await cursor.to_list(length=None))
