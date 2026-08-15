from fastapi import APIRouter

from app.dependencies import CurrentUser, JobServiceDep
from app.schemas.jobs import ProcessingJob

router = APIRouter(tags=["jobs"])


@router.get("/jobs/{job_id}", response_model=ProcessingJob)
async def get_job(job_id: str, current_user: CurrentUser, jobs: JobServiceDep) -> ProcessingJob:
    return await jobs.get(current_user.id, job_id)
