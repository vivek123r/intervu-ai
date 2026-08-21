from enum import StrEnum


class InterviewType(StrEnum):
    TECHNICAL = "technical"
    BEHAVIORAL = "behavioral"
    SYSTEM_DESIGN = "system_design"
    HIRING_MANAGER = "hiring_manager"
    RECRUITER = "recruiter"


class InterviewStatus(StrEnum):
    DETECTED = "detected"
    CONFIRMED = "confirmed"
    UPCOMING = "upcoming"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class RoundStatus(StrEnum):
    COMPLETED = "completed"
    CURRENT = "current"
    PENDING = "pending"


class Difficulty(StrEnum):
    EASY = "easy"
    NORMAL = "normal"
    HARD = "hard"
    BRUTAL = "brutal"


class ExperienceLevel(StrEnum):
    EARLY = "early"
    MID = "mid"
    SENIOR = "senior"
    STAFF = "staff"


class PreparationTaskStatus(StrEnum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class TaskPriority(StrEnum):
    HIGH = "high"
    NORMAL = "normal"


class PreparationTimelineStatus(StrEnum):
    COMPLETE = "complete"
    ACTIVE = "active"
    UPCOMING = "upcoming"


class TopicRelevance(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    NORMAL = "normal"


class SessionWireStatus(StrEnum):
    """The 4 values `PracticeSession.status` may take on the wire."""

    READY = "ready"
    ACTIVE = "active"
    PROCESSING = "processing"
    COMPLETED = "completed"


class HistoryStatus(StrEnum):
    """Terminal outcome of a past session, as the history log displays it. Distinct from
    `SessionWireStatus` — a live session is never `abandoned`, and history never shows
    `ready`/`active`."""

    COMPLETED = "completed"
    PROCESSING = "processing"
    ABANDONED = "abandoned"


class MetricTone(StrEnum):
    """How a history metric reads at a glance — drives its colour, not its value."""

    POSITIVE = "positive"
    NEUTRAL = "neutral"
    CAUTION = "caution"
    CRITICAL = "critical"


class ProtocolPriority(StrEnum):
    """How urgently a growth protocol on the completion view should be acted on."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class AnswerVerdict(StrEnum):
    """One answer's headline reading on the completion view, banded from its score."""

    STRONG = "strong"
    SOLID = "solid"
    NEEDS_WORK = "needs_work"


class SessionState(StrEnum):
    """The 10-value internal state machine — never sent as `PracticeSession.status`
    directly. See services/session_state.py for the `state -> SessionWireStatus`
    projection and docs/API-CONTRACT.md's WebSocket contract for transitions."""

    CREATED = "created"
    READY = "ready"
    INTRODUCTION = "introduction"
    RESUME = "resume"
    TECHNICAL = "technical"
    BEHAVIORAL = "behavioral"
    CANDIDATE_QUESTIONS = "candidate_questions"
    WRAP_UP = "wrap_up"
    PROCESSING = "processing"
    COMPLETED = "completed"


class JobType(StrEnum):
    CALENDAR_SYNC = "calendar_sync"
    PREPARATION_GENERATION = "preparation_generation"
    REPORT_GENERATION = "report_generation"
    RESUME_PARSING = "resume_parsing"


class JobStatus(StrEnum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class CalendarStatus(StrEnum):
    HEALTHY = "healthy"
    EXPIRED = "expired"
    ERROR = "error"


class CodingDifficulty(StrEnum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class CodingLanguage(StrEnum):
    PYTHON = "python"
    JAVASCRIPT = "javascript"


class SubmissionStatus(StrEnum):
    JUDGING = "judging"
    ACCEPTED = "accepted"
    WRONG_ANSWER = "wrong_answer"
    TIME_LIMIT_EXCEEDED = "time_limit_exceeded"
    RUNTIME_ERROR = "runtime_error"
    COMPILE_ERROR = "compile_error"


class CheckerKind(StrEnum):
    EXACT = "exact"
    FLOAT = "float"
    UNORDERED = "unordered"
    CUSTOM_MIN_WINDOW = "custom_min_window"


class ParamType(StrEnum):
    INT = "int"
    FLOAT = "float"
    STRING = "string"
    BOOLEAN = "boolean"
    LIST_INT = "list_int"
    LIST_FLOAT = "list_float"
    LIST_STRING = "list_string"
    LIST_BOOLEAN = "list_boolean"
    LIST_LIST_INT = "list_list_int"
    LIST_LIST_STRING = "list_list_string"
    LIST_NODE = "list_node"
    TREE_NODE = "tree_node"
    LIST_LIST_NODE_NULLABLE = "list_list_node_nullable"
