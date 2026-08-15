from typing import ClassVar

from app.core.serialization import CamelModel
from app.core.timeutils import UtcDatetime
from app.schemas.common import Difficulty, InterviewType, SessionWireStatus
from app.schemas.preparation import Question as QuestionRef


class PracticeConfig(CamelModel):
    role: str
    company: str
    type: InterviewType
    difficulty: Difficulty
    duration: int
    focus_areas: list[str]
    interviewer_style: str


class SessionAnswer(CamelModel):
    question_id: str
    question: str
    transcript: str
    duration_seconds: int
    score: float


class PracticeSession(CamelModel):
    omit_if_none: ClassVar[frozenset[str]] = frozenset({"started_at"})

    id: str
    status: SessionWireStatus
    config: PracticeConfig
    questions: list[QuestionRef]
    current_question_index: int
    answers: list[SessionAnswer]
    started_at: UtcDatetime | None = None


class AnswerReview(CamelModel):
    question: str
    answer: str
    score: float
    strengths: list[str]
    missing: list[str]
    better_structure: list[str]


class SpeechMetrics(CamelModel):
    average_wpm: int
    filler_count: int
    fillers: dict[str, int]
    long_pauses: int
    longest_pause: float
    average_answer_seconds: int


class InterviewReport(CamelModel):
    id: str
    session_id: str
    created_at: UtcDatetime
    overall: int
    technical: int
    communication: int
    structure: int
    clarity: int
    relevance: int
    depth: int
    summary: str
    speech: SpeechMetrics
    weak_topics: list[str]
    strengths: list[str]
    recommended_actions: list[str]
    answers: list[AnswerReview]


class AnswerCompletedRequest(CamelModel):
    omit_if_none: ClassVar[frozenset[str]] = frozenset({"pause_markers_ms"})

    question_id: str
    transcript: str
    started_at: UtcDatetime
    ended_at: UtcDatetime
    duration_ms: int
    pause_markers_ms: list[int] | None = None


class SocketTicket(CamelModel):
    ticket: str
    expires_at: UtcDatetime
