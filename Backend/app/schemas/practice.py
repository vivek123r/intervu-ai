from typing import Any, ClassVar

from pydantic import Field, field_validator

from app.core.serialization import CamelModel
from app.core.timeutils import UtcDatetime
from app.schemas.common import (
    AnswerAnalysisStatus,
    AnswerVerdict,
    Difficulty,
    InterviewType,
    MetricTone,
    ProtocolPriority,
    SessionWireStatus,
)
from app.schemas.interviewer import DifficultySignal, InterviewerLogEntry
from app.schemas.preparation import Question as QuestionRef

# Bounds for a practice session's length, in minutes. Named so callers that need
# to construct a placeholder config can't drift out of range.
MIN_SESSION_DURATION_MINUTES = 5
MAX_SESSION_DURATION_MINUTES = 120


class PracticeConfig(CamelModel):
    omit_if_none: ClassVar[frozenset[str]] = frozenset({"resume_id", "interview_id"})

    # Bounds exist because these values drive prompt construction and question
    # planning. `duration` in particular feeds `max(3, duration // 6)`, so an
    # unbounded int meant `duration=100000` planned 16,666 questions.
    role: str = Field(min_length=1, max_length=120)
    company: str = Field(min_length=1, max_length=120)
    type: InterviewType
    difficulty: Difficulty
    duration: int = Field(
        ge=MIN_SESSION_DURATION_MINUTES, le=MAX_SESSION_DURATION_MINUTES
    )
    focus_areas: list[str] = Field(max_length=8)
    interviewer_style: str = Field(min_length=1, max_length=80)
    resume_id: str | None = None
    # The interview this practice run was started from, when there was one. Lets a
    # completed mock feed back into that interview's preparation progress.
    interview_id: str | None = None

    @field_validator("focus_areas")
    @classmethod
    def _bound_focus_areas(cls, value: list[str]) -> list[str]:
        for item in value:
            if not item.strip() or len(item) > 80:
                raise ValueError("Each focus area must be 1-80 characters.")
        return value


class SessionAnswer(CamelModel):
    omit_if_none: ClassVar[frozenset[str]] = frozenset(
        {"follow_up", "score", "reasoning", "difficulty_signal"}
    )

    question_id: str
    question: str
    transcript: str
    duration_seconds: int
    pause_markers_ms: list[int] = []
    # None until the background analysis (services/analysis.py) lands — see
    # `analysis_status`. A session is never considered complete with any answer
    # still `pending`; `complete_session` drains every outstanding analysis first.
    analysis_status: AnswerAnalysisStatus = AnswerAnalysisStatus.PENDING
    score: float | None = None
    strengths: list[str] = []
    missing: list[str] = []
    reasoning: str | None = None
    difficulty_signal: DifficultySignal | None = None
    follow_up: bool | None = None


class PracticeSession(CamelModel):
    omit_if_none: ClassVar[frozenset[str]] = frozenset(
        {"started_at", "interviewer_log", "planned_question_count"}
    )

    id: str
    status: SessionWireStatus
    config: PracticeConfig
    questions: list[QuestionRef]
    current_question_index: int
    answers: list[SessionAnswer]
    planned_question_count: int | None = None
    started_at: UtcDatetime | None = None
    interviewer_log: list[InterviewerLogEntry] = []


class AnswerReview(CamelModel):
    # The session question this review is for. Report answers used to be joined
    # back to the session by lowercased question text with a positional fallback —
    # and `generate_report` used the opposite precedence to `CompletionService`,
    # so the two could disagree about which answer was which, and nothing stopped
    # two reviews collapsing onto the same session answer.
    question_id: str | None = None
    question: str
    answer: str
    score: float
    strengths: list[str]
    missing: list[str]
    better_structure: list[str]
    ai_comment: str | None = None


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
    # How many answers this score is actually based on, and how many could not be
    # scored (the background analysis failed, or never ran). Reports used to
    # silently substitute a neutral 7.0 for every unscored answer, so a session
    # where most scoring calls failed produced a confident-looking result built
    # from fabricated midpoints. The completion view surfaces these.
    scored_answer_count: int = 0
    unscored_answer_count: int = 0
    # True when the report came from the deterministic fallback rather than a real
    # model — its six dimensions are arithmetic offsets of `overall`, not an
    # independent assessment, so the UI must not present them as a skill breakdown.
    generated_offline: bool = False


class CompletionOverall(CamelModel):
    """The completion view's headline instrument — one score, what it means, and how it
    moved."""

    score: int
    band: str
    # NOTE: a `top_percent` ("TOP 3%") used to sit here, computed as `100 - overall`.
    # There is no cohort, so it was an invented standing shown as a measurement.
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
    ai_comment: str | None = None


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
    # Carried through from the report so the completion view can say how much of
    # this score was actually measured, and whether the dimension breakdown is a
    # real assessment or a derived one. See InterviewReport.
    scored_answer_count: int = 0
    unscored_answer_count: int = 0
    generated_offline: bool = False


class AnswerCompletedRequest(CamelModel):
    omit_if_none: ClassVar[frozenset[str]] = frozenset({"pause_markers_ms", "code_artifact"})

    question_id: str
    transcript: str
    started_at: UtcDatetime
    ended_at: UtcDatetime
    duration_ms: int
    pause_markers_ms: list[int] | None = None
    code_artifact: dict[str, Any] | None = None


class SocketTicket(CamelModel):
    ticket: str
    expires_at: UtcDatetime


from app.schemas.interviewer import AnswerAnalysisContext, TurnContext  # noqa: E402

TurnContext.model_rebuild()
AnswerAnalysisContext.model_rebuild()
