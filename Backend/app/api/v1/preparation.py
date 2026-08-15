from fastapi import APIRouter

from app.dependencies import CurrentUser, InterviewServiceDep, JobServiceDep, PreparationServiceDep
from app.schemas.common import JobType
from app.schemas.jobs import JobHandle
from app.schemas.preparation import PreparationPlan, PreparationTask, UpdateTaskStatusRequest

router = APIRouter(tags=["preparation"])


@router.post("/interviews/{interview_id}/prepare", response_model=JobHandle, status_code=202)
async def generate_preparation_plan(
    interview_id: str,
    current_user: CurrentUser,
    interviews: InterviewServiceDep,
    preparation: PreparationServiceDep,
    jobs: JobServiceDep,
) -> JobHandle:
    await interviews.get(current_user.id, interview_id)
    await preparation.generate_plan(current_user.id, interview_id)
    return await jobs.create(current_user.id, JobType.PREPARATION_GENERATION, interview_id)


@router.get("/interviews/{interview_id}/preparation", response_model=PreparationPlan)
async def get_preparation_plan(
    interview_id: str,
    current_user: CurrentUser,
    interviews: InterviewServiceDep,
    preparation: PreparationServiceDep,
) -> PreparationPlan:
    await interviews.get(current_user.id, interview_id)
    return await preparation.get_plan(interview_id)


@router.patch("/preparation/tasks/{task_id}", response_model=PreparationTask)
async def update_task_status(
    task_id: str,
    body: UpdateTaskStatusRequest,
    current_user: CurrentUser,
    preparation: PreparationServiceDep,
) -> PreparationTask:
    return await preparation.update_task_status(current_user.id, task_id, body)
