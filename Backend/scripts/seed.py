"""Idempotent seed script — upserts every fixture document by its literal `_id`.

Run with: uv run python -m scripts.seed
"""

import asyncio

from app.config import get_settings
from app.db.indexes import ensure_indexes
from app.db.mongo import mongo
from app.seed.fixtures import SEED_DATA


async def seed() -> None:
    settings = get_settings()
    mongo.connect(settings)
    await ensure_indexes(mongo.db)

    for collection_name, docs in SEED_DATA.items():
        collection = mongo.db[collection_name]
        for doc in docs:
            if collection_name == "users" and "firebase_uid" in doc:
                await collection.delete_many(
                    {"firebase_uid": doc["firebase_uid"], "_id": {"$ne": doc["_id"]}}
                )
            elif (
                collection_name in ("calendar_connections", "analytics_overviews")
                and "user_id" in doc
            ):
                await collection.delete_many(
                    {"user_id": doc["user_id"], "_id": {"$ne": doc["_id"]}}
                )
            elif collection_name == "reports" and "session_id" in doc:
                await collection.delete_many(
                    {"session_id": doc["session_id"], "_id": {"$ne": doc["_id"]}}
                )
            await collection.update_one({"_id": doc["_id"]}, {"$set": doc}, upsert=True)
        print(f"seeded {len(docs)} into {collection_name}")

    mongo.close()


if __name__ == "__main__":
    asyncio.run(seed())
