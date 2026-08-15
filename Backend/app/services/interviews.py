from app.core.ids import IdPrefix, new_id
from app.errors.codes import ErrorCode
from app.errors.exceptions import NotFoundError
from app.repositories.interviews import InterviewRepository
from app.schemas.common import InterviewStatus, RoundStatus
from app.schemas.interviews import CreateInterviewRequest, Interview, UpdateInterviewRequest

_NOT_FOUND_MESSAGE = "That interview could not be found."


class InterviewService:
    def __init__(self, interviews: InterviewRepository) -> None:
        self._interviews = interviews

    async def list_for_user(self, user_id: str) -> list[Interview]:
        docs = await self._interviews.list_for_user(user_id)
        return [Interview(**doc) for doc in docs]

    async def get(self, user_id: str, interview_id: str) -> Interview:
        doc = await self._interviews.get(user_id, interview_id)
        if doc is None:
            raise NotFoundError(ErrorCode.INTERVIEW_NOT_FOUND, _NOT_FOUND_MESSAGE)
        return Interview(**doc)

    async def create(self, user_id: str, request: CreateInterviewRequest) -> Interview:
        doc = {
            "id": new_id(IdPrefix.INTERVIEW),
            "user_id": user_id,
            "company": request.company,
            "company_mark": request.company[:1].upper(),
            "role": request.role,
            "type": request.type,
            "round": "Current round",
            "round_number": 1,
            "total_rounds": 1,
            "scheduled_at": request.scheduled_at,
            "timezone": request.timezone,
            "duration_minutes": 60,
            "meeting_url": None,
            "recruiter": None,
            "interviewers": None,
            "status": InterviewStatus.UPCOMING,
            "readiness": 0,
            "preparation_progress": 0,
            "location": "Not added",
            "accent": "#f0b94c",
            "rounds": [
                {
                    "id": new_id(IdPrefix.ROUND),
                    "name": "Current round",
                    "type": request.type,
                    "status": RoundStatus.CURRENT,
                }
            ],
            "provider_event_id": None,
        }
        await self._interviews.insert(doc)
        return Interview(**doc)

    async def update(
        self, user_id: str, interview_id: str, request: UpdateInterviewRequest
    ) -> Interview:
        changes = request.model_dump(exclude_unset=True)
        doc = await self._interviews.update(user_id, interview_id, changes)
        if doc is None:
            raise NotFoundError(ErrorCode.INTERVIEW_NOT_FOUND, _NOT_FOUND_MESSAGE)
        return Interview(**doc)

    async def confirm(self, user_id: str, interview_id: str) -> Interview:
        doc = await self._interviews.update(
            user_id, interview_id, {"status": InterviewStatus.CONFIRMED}
        )
        if doc is None:
            raise NotFoundError(ErrorCode.INTERVIEW_NOT_FOUND, _NOT_FOUND_MESSAGE)
        return Interview(**doc)

    async def delete(self, user_id: str, interview_id: str) -> None:
        deleted = await self._interviews.delete(user_id, interview_id)
        if not deleted:
            raise NotFoundError(ErrorCode.INTERVIEW_NOT_FOUND, _NOT_FOUND_MESSAGE)
