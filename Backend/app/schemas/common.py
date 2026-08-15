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
