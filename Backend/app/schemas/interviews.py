from typing import ClassVar

from app.core.serialization import CamelModel
from app.core.timeutils import UtcDatetime
from app.schemas.common import InterviewStatus, InterviewType, RoundStatus


class InterviewRound(CamelModel):
    id: str
    name: str
    type: InterviewType
    status: RoundStatus


class Interview(CamelModel):
    omit_if_none: ClassVar[frozenset[str]] = frozenset({"meeting_url", "recruiter", "interviewers"})

    id: str
    company: str
    company_mark: str
    role: str
    type: InterviewType
    round: str
    round_number: int
    total_rounds: int
    scheduled_at: UtcDatetime
    timezone: str
    duration_minutes: int
    meeting_url: str | None = None
    recruiter: str | None = None
    interviewers: list[str] | None = None
    status: InterviewStatus
    readiness: int
    preparation_progress: int
    location: str
    accent: str
    rounds: list[InterviewRound]


class CreateInterviewRequest(CamelModel):
    company: str
    role: str
    type: InterviewType
    scheduled_at: UtcDatetime
    timezone: str


class UpdateInterviewRequest(CamelModel):
    company: str | None = None
    role: str | None = None
    type: InterviewType | None = None
    scheduled_at: UtcDatetime | None = None
    timezone: str | None = None
    meeting_url: str | None = None
    recruiter: str | None = None
    interviewers: list[str] | None = None
