from fastapi import APIRouter, Response

from app.dependencies import CurrentUser, InterviewServiceDep, PreparationServiceDep
from app.schemas.interviews import CreateInterviewRequest, Interview, UpdateInterviewRequest

router = APIRouter(tags=["interviews"])


@router.get("/interviews", response_model=list[Interview])
async def list_interviews(
    current_user: CurrentUser, interviews: InterviewServiceDep
) -> list[Interview]:
    return await interviews.list_for_user(current_user.id)


@router.post("/interviews", response_model=Interview, status_code=201)
async def create_interview(
    body: CreateInterviewRequest, current_user: CurrentUser, interviews: InterviewServiceDep
) -> Interview:
    return await interviews.create(current_user.id, body)


@router.get("/interviews/{interview_id}", response_model=Interview)
async def get_interview(
    interview_id: str, current_user: CurrentUser, interviews: InterviewServiceDep
) -> Interview:
    return await interviews.get(current_user.id, interview_id)


@router.patch("/interviews/{interview_id}", response_model=Interview)
async def update_interview(
    interview_id: str,
    body: UpdateInterviewRequest,
    current_user: CurrentUser,
    interviews: InterviewServiceDep,
) -> Interview:
    return await interviews.update(current_user.id, interview_id, body)


@router.delete("/interviews/{interview_id}", status_code=204, response_class=Response)
async def delete_interview(
    interview_id: str,
    current_user: CurrentUser,
    interviews: InterviewServiceDep,
    preparation: PreparationServiceDep,
) -> Response:
    await interviews.delete(current_user.id, interview_id)
    await preparation.delete_all_for_interview(interview_id)
    return Response(status_code=204)


@router.post("/interviews/{interview_id}/confirm", response_model=Interview)
async def confirm_interview(
    interview_id: str, current_user: CurrentUser, interviews: InterviewServiceDep
) -> Interview:
    return await interviews.confirm(current_user.id, interview_id)
