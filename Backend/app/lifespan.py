from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import get_settings
from app.db.indexes import ensure_indexes
from app.db.mongo import mongo


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    if not mongo.is_connected:
        mongo.connect(settings)
    await ensure_indexes(mongo.db)
    yield
    mongo.close()
