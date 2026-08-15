from app.core.serialization import CamelModel
from app.core.timeutils import UtcDatetime
from app.schemas.common import HistoryStatus, MetricTone


class HistoryMetric(CamelModel):
    """One evaluated dimension of a past session. `value` is already display-ready
    ("High", "94%", "Stable") because the scale differs per metric — the frontend maps
    `key` to an icon and `tone` to a colour, and never reformats the value."""

    key: str
    label: str
    value: str
    tone: MetricTone


class HistorySession(CamelModel):
    id: str
    code: str
    company: str
    role: str
    mode: str
    started_at: UtcDatetime
    duration_minutes: int
    score: int
    status: HistoryStatus
    # null while a session is still `processing` — there is no report to open yet.
    report_id: str | None = None
    metrics: list[HistoryMetric]
