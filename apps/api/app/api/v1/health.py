from __future__ import annotations

from contextlib import suppress
from typing import Any

from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.config import get_settings
from app.db.session import SessionFactory

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health() -> dict[str, str]:
    settings = get_settings()
    return {"status": "ok", "service": settings.app_name, "version": settings.app_version}


@router.get("/health/ready")
async def readiness(request: Request) -> JSONResponse:
    checks: dict[str, Any] = {"database": "unavailable", "redis": "unavailable"}
    try:
        async with SessionFactory() as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        pass
    with suppress(Exception):
        checks["redis"] = "ok" if await request.app.state.redis.ping() else "unavailable"
    ready = all(value == "ok" for value in checks.values())
    return JSONResponse(
        status_code=status.HTTP_200_OK if ready else status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"status": "ready" if ready else "degraded", "checks": checks},
    )
