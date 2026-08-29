"""Unit tests for the derived analytics overview.

`analytics_overviews` used to be written only by the seed fixtures, so completing
real interviews never changed the analytics page. These cover the aggregation that
now backs it, plus the specific arithmetic traps in that kind of code.
"""

from datetime import UTC, date, datetime, timedelta
from typing import Any

import pytest

from app.schemas.common import TopicRelevance
from app.services.analytics import (
    AnalyticsService,
    _micro_metrics,
    _readiness_of,
    _streak_days,
)


def _report(report_id: str, overall: int, created_at: datetime, **dims: int) -> dict[str, Any]:
    base = {key: overall for key in ("technical", "communication", "structure", "clarity", "relevance", "depth")}
    base.update(dims)
    return {
        "id": report_id,
        "overall": overall,
        "created_at": created_at,
        "speech": {
            "average_wpm": 140,
            "filler_count": 3,
            "average_answer_seconds": 60,
            "long_pauses": 1,
        },
        **base,
    }


class _FakeRepo:
    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self._rows = rows
        self.upserted: dict[str, Any] | None = None

    async def list_for_user(self, user_id: str) -> list[dict[str, Any]]:
        return self._rows

    async def get(self, user_id: str) -> dict[str, Any] | None:
        return self.upserted

    async def upsert(self, user_id: str, doc: dict[str, Any]) -> None:
        self.upserted = doc


def test_readiness_is_the_mean_of_the_six_dimensions() -> None:
    report = _report("r1", 80, datetime.now(UTC), technical=90, depth=60)
    # (90 + 80 + 80 + 80 + 80 + 60) / 6
    assert _readiness_of(report) == 78


def test_streak_counts_back_from_today() -> None:
    today = date(2026, 8, 29)
    active = {today, today - timedelta(days=1), today - timedelta(days=2)}
    assert _streak_days(active, today) == 3


def test_streak_survives_a_day_that_has_not_happened_yet() -> None:
    """A streak must not reset the moment the clock passes midnight."""
    today = date(2026, 8, 29)
    active = {today - timedelta(days=1), today - timedelta(days=2)}
    assert _streak_days(active, today) == 2


def test_streak_breaks_on_a_gap() -> None:
    today = date(2026, 8, 29)
    active = {today, today - timedelta(days=3)}
    assert _streak_days(active, today) == 1


def test_streak_is_zero_with_no_activity() -> None:
    assert _streak_days(set(), date(2026, 8, 29)) == 0


@pytest.mark.asyncio
async def test_overview_is_built_from_reports_not_fixtures() -> None:
    now = datetime.now(UTC)
    reports = _FakeRepo(
        [
            _report("report-1", 60, now - timedelta(days=2)),
            _report("report-2", 80, now),
        ]
    )
    analytics = _FakeRepo([])
    service = AnalyticsService(
        analytics,  # type: ignore[arg-type]
        reports,  # type: ignore[arg-type]
        _FakeRepo([]),  # type: ignore[arg-type]
        _FakeRepo([]),  # type: ignore[arg-type]
    )

    await service.recompute("user-1")

    assert analytics.upserted is not None
    assert analytics.upserted["overall_score"] == 80
    assert analytics.upserted["score_trend"] == [60, 80]
    # 60 -> 80 is a third better than where it started.
    assert analytics.upserted["improvement_percent"] == 33


@pytest.mark.asyncio
async def test_improvement_percent_can_be_negative() -> None:
    """A decline has to be visible. The dashboard's old delta was floored at zero,
    so a candidate getting worse was shown '+0'."""
    now = datetime.now(UTC)
    reports = _FakeRepo(
        [
            _report("report-1", 80, now - timedelta(days=2)),
            _report("report-2", 60, now),
        ]
    )
    analytics = _FakeRepo([])
    service = AnalyticsService(
        analytics,  # type: ignore[arg-type]
        reports,  # type: ignore[arg-type]
        _FakeRepo([]),  # type: ignore[arg-type]
        _FakeRepo([]),  # type: ignore[arg-type]
    )

    await service.recompute("user-1")

    assert analytics.upserted is not None
    assert analytics.upserted["improvement_percent"] == -25


@pytest.mark.asyncio
async def test_empty_history_produces_a_zero_overview_not_a_crash() -> None:
    analytics = _FakeRepo([])
    service = AnalyticsService(
        analytics,  # type: ignore[arg-type]
        _FakeRepo([]),  # type: ignore[arg-type]
        _FakeRepo([]),  # type: ignore[arg-type]
        _FakeRepo([]),  # type: ignore[arg-type]
    )

    await service.recompute("user-1")

    assert analytics.upserted is not None
    assert analytics.upserted["overall_score"] == 0
    assert analytics.upserted["score_trend"] == []


@pytest.mark.asyncio
async def test_topic_performance_ignores_answers_that_were_never_scored() -> None:
    """An answer whose background analysis failed carries no score. Counting it as
    anything would let a scoring outage quietly drag a topic's average."""
    sessions = _FakeRepo(
        [
            {
                "questions": [
                    {"id": "q1", "topic": "Caching"},
                    {"id": "q2", "topic": "Caching"},
                ],
                "answers": [
                    {"question_id": "q1", "score": 8.0},
                    {"question_id": "q2", "score": None},
                ],
            }
        ]
    )
    service = AnalyticsService(
        _FakeRepo([]),  # type: ignore[arg-type]
        _FakeRepo([]),  # type: ignore[arg-type]
        sessions,  # type: ignore[arg-type]
        _FakeRepo([]),  # type: ignore[arg-type]
    )

    performance = await service._topic_performance("user-1")

    assert performance == [
        {"topic": "Caching", "score": 80, "trend": 0, "relevance": TopicRelevance.NORMAL}
    ]


def test_micro_metrics_report_no_change_rather_than_a_fake_delta() -> None:
    metrics = _micro_metrics([_report("r1", 80, datetime.now(UTC))])
    wpm = next(m for m in metrics if m["key"] == "wpm")
    assert wpm["value"] == 140
    assert wpm["delta"] == "No change"
