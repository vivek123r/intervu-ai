from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select

from app.db.session import SessionFactory
from app.models.analytics import ProcessingJob


async def processing_heartbeat_job(
    ctx: dict[str, Any], job_id: str, *, phase: str = "queued"
) -> dict[str, object]:
    """Small durable primitive used by integration-specific jobs and worker health checks."""
    del ctx
    async with SessionFactory() as session:
        job = await session.scalar(select(ProcessingJob).where(ProcessingJob.id == UUID(job_id)))
        if job is None:
            return {"status": "missing"}
        job.status = "running"
        job.phase = phase
        job.progress = max(job.progress, 5)
        job.started_at = job.started_at or datetime.now(UTC)
        await session.commit()
        return {"status": job.status, "progress": job.progress}


async def worker_health_job(ctx: dict[str, Any]) -> dict[str, str]:
    del ctx
    return {"status": "ok", "checked_at": datetime.now(UTC).isoformat()}
