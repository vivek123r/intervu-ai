from typing import Any

from app.core.ids import IdPrefix, new_id
from app.core.timeutils import utcnow
from app.errors.codes import ErrorCode
from app.errors.exceptions import NotFoundError
from app.repositories.jobs import JobRepository
from app.schemas.common import JobStatus, JobType
from app.schemas.jobs import JobHandle, ProcessingJob

# The result of every job type here is deterministic and cheap to compute, so the
# real work happens synchronously in create(). This constant only paces the illusion
# of a "processing" state for the frontend's poll — see docs/API-CONTRACT.md's job
# polling section. Kept above the frontend's ~2s poll interval so a first poll can
# genuinely observe "processing" before "completed" (MSW's 1.2s never did).
JOB_DURATION_SECONDS = 3.0


class JobService:
    def __init__(self, jobs: JobRepository) -> None:
        self._jobs = jobs

    async def create(self, user_id: str, job_type: JobType, result_id: str) -> JobHandle:
        doc = {
            "id": new_id(IdPrefix.JOB),
            "user_id": user_id,
            "type": job_type,
            "result_id": result_id,
            "created_at": utcnow(),
        }
        await self._jobs.insert(doc)
        return JobHandle(job_id=doc["id"], type=job_type)

    async def get(self, user_id: str, job_id: str) -> ProcessingJob:
        doc = await self._jobs.get(user_id, job_id)
        if doc is None:
            raise NotFoundError(ErrorCode.JOB_NOT_FOUND, "That job could not be found.")
        return self._project(doc)

    @staticmethod
    def _project(doc: dict[str, Any]) -> ProcessingJob:
        elapsed = (utcnow() - doc["created_at"]).total_seconds()
        progress = min(1.0, max(0.0, elapsed / JOB_DURATION_SECONDS))
        status = JobStatus.COMPLETED if progress >= 1.0 else JobStatus.PROCESSING
        return ProcessingJob(
            id=doc["id"],
            type=doc["type"],
            status=status,
            progress=round(progress, 2),
            result_id=doc["result_id"] if status == JobStatus.COMPLETED else None,
            error=None,
        )
