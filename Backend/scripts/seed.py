"""Idempotent seed script — upserts fixture documents by literal `_id`.

Run with:
  uv run python -m scripts.seed               # seeds all fixture collections
  uv run python -m scripts.seed --coding-only # seeds only coding_problems collection
"""

import argparse
import asyncio

from app.config import get_settings
from app.db.indexes import ensure_indexes
from app.db.mongo import mongo
from app.seed.fixtures import SEED_DATA


async def seed(coding_only: bool = False) -> None:
    settings = get_settings()
    mongo.connect(settings)
    await ensure_indexes(mongo.db)

    target_data = (
        {"coding_problems": SEED_DATA["coding_problems"]}
        if coding_only
        else SEED_DATA
    )

    for collection_name, docs in target_data.items():
        collection = mongo.db[collection_name]
        for doc in docs:
            if not coding_only:
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
    parser = argparse.ArgumentParser(description="Seed database fixtures")
    parser.add_argument(
        "--coding-only",
        "-c",
        action="store_true",
        help="Seed only the coding_problems collection without touching any other collections",
    )
    args = parser.parse_args()
    asyncio.run(seed(coding_only=args.coding_only))
