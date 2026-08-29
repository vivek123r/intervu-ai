import logging
from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Any

from app.repositories.analytics import AnalyticsRepository
from app.repositories.history import HistoryRepository
from app.repositories.practice import PracticeSessionRepository
from app.repositories.reports import ReportRepository
from app.schemas.analytics import AnalyticsOverview
from app.schemas.common import TopicRelevance

logger = logging.getLogger(__name__)

# A user with no completed sessions sees a zero-value overview rather than a 404 —
# there is genuinely nothing to report, and the UI renders empty states from it.
_EMPTY_OVERVIEW: dict[str, Any] = {
    "overall_score": 0,
    "readiness_score": 0,
    "streak_days": 0,
    "improvement_percent": 0,
    "score_trend": [],
    "readiness_trend": [],
    "micro_metrics": [],
    "topic_performance": [],
    "recent_sessions": [],
}

# The six report dimensions that together stand in for "ready for this interview".
_READINESS_DIMENSIONS = (
    "technical",
    "communication",
    "structure",
    "clarity",
    "relevance",
    "depth",
)

# How many sessions a trend line covers. Long enough to show a direction, short
# enough that a year-old session doesn't drag the current picture.
_TREND_WINDOW = 10

# Ranges the analytics page offers, in days. `None` means "all time".
RANGE_DAYS: dict[str, int | None] = {"7d": 7, "30d": 30, "3m": 90, "all": None}


def _mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def _readiness_of(report: dict[str, Any]) -> int:
    dims = [float(report.get(key, 0) or 0) for key in _READINESS_DIMENSIONS]
    return round(_mean(dims))


def _streak_days(days_active: set[date], today: date) -> int:
    """Consecutive days ending today (or yesterday) on which a session completed.

    Counting back from yesterday when today is empty keeps a streak alive through
    the current day rather than resetting it at midnight.
    """
    if not days_active:
        return 0
    cursor = today if today in days_active else today - timedelta(days=1)
    if cursor not in days_active:
        return 0
    streak = 0
    while cursor in days_active:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


def _topic_relevance(sample_count: int, score: int) -> TopicRelevance:
    """How much attention a topic warrants: weak topics with real evidence first."""
    if score < 60 and sample_count >= 2:
        return TopicRelevance.CRITICAL
    if score < 75:
        return TopicRelevance.HIGH
    return TopicRelevance.NORMAL


def _delta_label(current: float, previous: float, unit: str = "") -> str:
    diff = current - previous
    if abs(diff) < 0.05:
        return "No change"
    return f"{'+' if diff > 0 else ''}{round(diff, 1)}{unit}"


class AnalyticsService:
    """Reads the derived overview, and rebuilds it from source records.

    The overview is a projection, never an independent source of truth: every value
    is recomputed from the user's reports, practice sessions and history log. It
    used to be written only by the seed fixtures, so completing real interviews
    never changed the analytics page.
    """

    def __init__(
        self,
        analytics: AnalyticsRepository,
        reports: ReportRepository | None = None,
        sessions: PracticeSessionRepository | None = None,
        history: HistoryRepository | None = None,
    ) -> None:
        self._analytics = analytics
        self._reports = reports
        self._sessions = sessions
        self._history = history

    async def get_overview(self, user_id: str, range_key: str = "all") -> AnalyticsOverview:
        doc = await self._analytics.get(user_id)
        if doc is None:
            return AnalyticsOverview(**_EMPTY_OVERVIEW)
        return AnalyticsOverview(**self._apply_range(doc, range_key))

    def _apply_range(self, doc: dict[str, Any], range_key: str) -> dict[str, Any]:
        """Trims the stored series to the requested window.

        The overview is stored whole; narrowing here keeps one cached document per
        user instead of one per (user, range).
        """
        days = RANGE_DAYS.get(range_key)
        if days is None:
            return doc

        cutoff = date.today() - timedelta(days=days)
        recent = [
            row
            for row in doc.get("recent_sessions", [])
            if _as_date(row.get("completed_at")) is None
            or (_as_date(row.get("completed_at")) or cutoff) >= cutoff
        ]
        # Trends are stored newest-last and one point per session, so keeping the
        # tail of the same length as the surviving sessions keeps them aligned.
        keep = len(recent)
        trimmed = dict(doc)
        trimmed["recent_sessions"] = recent
        trimmed["score_trend"] = doc.get("score_trend", [])[-keep:] if keep else []
        trimmed["readiness_trend"] = doc.get("readiness_trend", [])[-keep:] if keep else []
        return trimmed

    async def recompute(self, user_id: str) -> None:
        """Rebuilds and stores the overview. Called after a report is finalized.

        Never raises into the caller: a failure here must not fail the interview
        the user just completed.
        """
        if not (self._reports and self._sessions and self._history):
            return
        try:
            overview = await self._build(user_id)
            await self._analytics.upsert(user_id, overview)
        except Exception:
            logger.exception("Failed to recompute analytics overview for user %s", user_id)

    async def _build(self, user_id: str) -> dict[str, Any]:
        assert self._reports and self._sessions and self._history
        reports = await self._reports.list_for_user(user_id)
        if not reports:
            return dict(_EMPTY_OVERVIEW)

        window = reports[-_TREND_WINDOW:]
        score_trend = [int(r.get("overall", 0) or 0) for r in window]
        readiness_trend = [_readiness_of(r) for r in window]

        latest = reports[-1]
        first_score = score_trend[0] if score_trend else 0
        last_score = score_trend[-1] if score_trend else 0
        improvement = (
            round(((last_score - first_score) / first_score) * 100) if first_score else 0
        )

        history_rows = await self._history.list_for_user(user_id)
        days_active = {
            d for row in history_rows if (d := _as_date(row.get("started_at"))) is not None
        }

        return {
            "overall_score": int(latest.get("overall", 0) or 0),
            "readiness_score": _readiness_of(latest),
            "streak_days": _streak_days(days_active, date.today()),
            # Signed on purpose: a decline must be visible, not floored at zero.
            "improvement_percent": improvement,
            "score_trend": score_trend,
            "readiness_trend": readiness_trend,
            "micro_metrics": _micro_metrics(window),
            "topic_performance": await self._topic_performance(user_id),
            "recent_sessions": _recent_sessions(reports, history_rows),
        }

    async def _topic_performance(self, user_id: str) -> list[dict[str, Any]]:
        """Mean answer score per question topic, across every session.

        Computed from the sessions rather than the reports because only the session
        keeps each question's topic alongside the score its answer received. Answers
        whose analysis failed carry no score and are skipped, so a failed scoring
        pass can't quietly drag a topic's average.
        """
        assert self._sessions
        sessions = await self._sessions.list_for_user(user_id)
        by_topic: dict[str, list[float]] = defaultdict(list)
        recent_by_topic: dict[str, list[float]] = defaultdict(list)

        for index, session in enumerate(sessions):
            topics = {
                q.get("id"): q.get("topic")
                for q in session.get("questions", [])
                if q.get("id") and q.get("topic")
            }
            is_recent = index >= len(sessions) - 3
            for answer in session.get("answers", []):
                score = answer.get("score")
                topic = topics.get(answer.get("question_id"))
                if score is None or not topic:
                    continue
                by_topic[topic].append(float(score))
                if is_recent:
                    recent_by_topic[topic].append(float(score))

        performance: list[dict[str, Any]] = []
        for topic, scores in by_topic.items():
            overall = round(_mean(scores) * 10)
            recent = recent_by_topic.get(topic)
            # Trend compares the last three sessions against the full history, so a
            # topic that has only ever been seen once reports no movement.
            trend = round(_mean(recent) * 10) - overall if recent and len(scores) > len(recent) else 0
            performance.append(
                {
                    "topic": topic,
                    "score": overall,
                    "trend": trend,
                    "relevance": _topic_relevance(len(scores), overall),
                }
            )

        performance.sort(key=lambda item: item["score"])
        return performance[:8]


def _as_date(value: Any) -> date | None:
    """Accepts a datetime, a date, or None — history and report timestamps arrive
    as timezone-aware datetimes, but seeded fixtures can carry plain dates."""
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return None


def _micro_metrics(reports: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Speech measurements over the trend window — all genuinely measured, unlike
    the report's qualitative dimensions."""
    if not reports:
        return []

    def series(key: str) -> list[float]:
        return [float((r.get("speech") or {}).get(key, 0) or 0) for r in reports]

    definitions = [
        ("wpm", "Words per minute", "average_wpm", ""),
        ("fillers", "Filler words per session", "filler_count", ""),
        ("answer_length", "Seconds per answer", "average_answer_seconds", "s"),
        ("long_pauses", "Long pauses per session", "long_pauses", ""),
    ]

    metrics: list[dict[str, Any]] = []
    for key, label, field, unit in definitions:
        values = series(field)
        if not values:
            continue
        current = values[-1]
        previous = values[-2] if len(values) > 1 else current
        metrics.append(
            {
                "key": key,
                "label": label,
                "value": round(current, 1),
                "delta": _delta_label(current, previous, unit),
                "trend": [round(v) for v in values],
            }
        )
    return metrics


def _recent_sessions(
    reports: list[dict[str, Any]], history_rows: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """The five most recent completed sessions, newest first."""
    by_report = {row.get("report_id"): row for row in history_rows}
    rows: list[dict[str, Any]] = []
    for report in reversed(reports[-5:]):
        row = by_report.get(report["id"]) or {}
        rows.append(
            {
                "report_id": report["id"],
                "company": row.get("company") or "Practice",
                "mode": row.get("mode") or "Practice mock",
                "score": int(report.get("overall", 0) or 0),
                "completed_at": report["created_at"],
            }
        )
    return rows
