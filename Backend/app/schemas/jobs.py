from app.core.serialization import CamelModel
from app.schemas.common import JobStatus, JobType


class ProcessingJob(CamelModel):
    """The `GET /jobs/{id}` polling shape."""

    id: str
    type: JobType
    status: JobStatus
    progress: float
    result_id: str | None
    error: str | None


class JobHandle(CamelModel):
    """The minimal `{jobId, type}` envelope returned by endpoints that just started a
    job — distinct from ProcessingJob's `id`/`status`/`progress` polling shape."""

    job_id: str
    type: JobType


class ReportJobHandle(JobHandle):
    """`POST /sessions/{id}/complete`'s response — a JobHandle plus the session id."""

    session_id: str
