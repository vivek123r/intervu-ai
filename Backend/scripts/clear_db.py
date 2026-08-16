"""Utility script to wipe all documents from MongoDB collections while preserving indexes.

Run with: uv run python -m scripts.clear_db
"""

import asyncio

from app.config import get_settings
from app.db.indexes import ensure_indexes
from app.db.mongo import mongo


async def clear() -> None:
    settings = get_settings()
    mongo.connect(settings)

    collections = await mongo.db.list_collection_names()
    print(f'Clearing collections in database "{settings.mongodb_db}"...\n')

    for name in collections:
        if not name.startswith("system."):
            res = await mongo.db[name].delete_many({})
            print(f"✓ Cleared collection `{name}` ({res.deleted_count} documents removed)")

    await ensure_indexes(mongo.db)
    print("\n✓ Database clean and indexes ensured.")
    mongo.close()


if __name__ == "__main__":
    asyncio.run(clear())
