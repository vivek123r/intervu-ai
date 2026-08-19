from typing import TYPE_CHECKING, ClassVar

from app.core.serialization import CamelModel
from app.core.timeutils import UtcDatetime
from app.schemas.common import (
    AnswerVerdict,
    Difficulty,
    InterviewType,
    MetricTone,
    ProtocolPriority,
    SessionWireStatus,
)
from app.schemas.preparation import Question as QuestionRef

from app.schemas.interviewer import InterviewerLogEntry


class PracticeConfig(CamelModel):
    omit_if_none: ClassVar[frozenset[str]] = frozenset({"resume_id"})

    role: str
    company: str
    type: InterviewType
    difficulty: Difficulty
    duration: int
    focus_areas: list[str]
    interviewer_style: str
    resume_id: str | None = None


class SessionAnswer(CamelModel):
    omit_if_none: ClassVar[frozenset[str]] = frozenset({"follow_up"})

    question_id: str
    question: str
    transcript: str
    duration_seconds: int
    score: float
    strengths: list[str] = []
    missing: list[str] = []
    follow_up: bool | None = None


class PracticeSession(CamelModel):
    omit_if_none: ClassVar[frozenset[str]] = frozenset({"started_at", "interviewer_log"})

    id: str
    status: SessionWireStatus
    config: PracticeConfig
    questions: list[QuestionRef]
    current_question_index: int
    answers: list[SessionAnswer]
    started_at: UtcDatetime | None = None
    interviewer_log: list[InterviewerLogEntry] = []


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


class CompletionOverall(CamelModel):
    """The completion view's headline instrument — one score, what it means, and how it
    moved."""

    score: int
    band: str
    # Standing among comparable sessions, expressed as "top N%" — 3 reads as "TOP 3%".
    top_percent: int
    delta_from_previous: int
    caption: str


class SignatureAxis(CamelModel):
    """One spoke of the six-axis signature chart. `benchmark` is the target this axis is
    read against, not a peer average."""

    key: str
    label: str
    value: int
    benchmark: int


class CompletionMetric(CamelModel):
    """A metric tile. `band` is display copy for the value ("Optimal"), `tone` drives its
    colour only, and `delta` is already display-ready — null when there is no comparable
    previous session to measure against."""

    key: str
    label: str
    value: int
    band: str
    tone: MetricTone
    delta: str | None = None


class GrowthProtocol(CamelModel):
    id: str
    priority: ProtocolPriority
    title: str
    detail: str
    # Seeds the targeted-retry deep link back into /practice/setup.
    focus_area: str


class CompletionQuestion(CamelModel):
    """One asked question with its answer and per-answer analysis, as the completion
    view's question list renders it."""

    id: str
    position: int
    question: str
    topic: str
    category: str
    difficulty: Difficulty
    score: float
    duration_seconds: int
    verdict: AnswerVerdict
    answer: str
    strengths: list[str]
    missing: list[str]
    better_structure: list[str]


class SessionCompletion(CamelModel):
    """Everything the post-interview completion screen renders, composed from the report,
    the session that produced it, and the history log — see services/completion.py."""

    report_id: str
    session_id: str
    code: str
    role: str
    company: str
    mode: str
    completed_at: UtcDatetime
    duration_minutes: int
    questions_answered: int
    overall: CompletionOverall
    summary: str
    signature: list[SignatureAxis]
    metrics: list[CompletionMetric]
    speech: SpeechMetrics
    strengths: list[str]
    protocols: list[GrowthProtocol]
    questions: list[CompletionQuestion]


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
