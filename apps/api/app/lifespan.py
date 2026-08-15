from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from redis.asyncio import Redis

from app.config import get_settings
from app.db.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    logger = structlog.get_logger("lifespan")
    app.state.redis = Redis.from_url(settings.redis_url, decode_responses=True)
    logger.info("application.started", environment=settings.environment)
    try:
        yield
    finally:
        await app.state.redis.aclose()
        await engine.dispose()
        logger.info("application.stopped")
