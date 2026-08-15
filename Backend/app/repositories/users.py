from typing import Any

from app.repositories.base import BaseRepository


class UserRepository(BaseRepository):
    collection_name = "users"

    async def get_by_id(self, user_id: str) -> dict[str, Any] | None:
        return self._from_doc(await self._collection.find_one({"_id": user_id}))

    async def get_by_firebase_uid(self, firebase_uid: str) -> dict[str, Any] | None:
        return self._from_doc(await self._collection.find_one({"firebase_uid": firebase_uid}))

    async def insert(self, doc: dict[str, Any]) -> None:
        await self._collection.insert_one(self._to_doc(doc))

    async def update(self, user_id: str, changes: dict[str, Any]) -> dict[str, Any] | None:
        if not changes:
            return await self.get_by_id(user_id)
        await self._collection.update_one({"_id": user_id}, {"$set": changes})
        return await self.get_by_id(user_id)
