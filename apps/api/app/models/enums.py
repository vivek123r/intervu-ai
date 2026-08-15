from enum import StrEnum


class CalendarConnectionStatus(StrEnum):
    CONNECTED = "connected"
    EXPIRED = "expired"
    REVOKED = "revoked"
    ERROR = "error"


class InterviewStatus(StrEnum):
    DETECTED = "detected"
    CONFIRMED = "confirmed"
    UPCOMING = "upcoming"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REJECTED = "rejected"
    OFFER = "offer"


class InterviewSource(StrEnum):
    MANUAL = "manual"
    GOOGLE_CALENDAR = "google_calendar"


class PreparationTaskStatus(StrEnum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"


class SessionState(StrEnum):
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


class SessionStatus(StrEnum):
    CREATED = "created"
    ACTIVE = "active"
    PAUSED = "paused"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class ProcessingJobStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class NotificationType(StrEnum):
    INTERVIEW_DETECTED = "interview_detected"
    INTERVIEW_TOMORROW = "interview_tomorrow"
    INTERVIEW_TODAY = "interview_today"
    PREP_TASK_DUE = "prep_task_due"
    WEAK_TOPIC_REMINDER = "weak_topic_reminder"
    MOCK_REPORT_READY = "mock_report_ready"
    CALENDAR_SYNC_FAILED = "calendar_sync_failed"
