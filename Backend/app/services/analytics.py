from typing import Any

from app.repositories.analytics import AnalyticsRepository
from app.schemas.analytics import AnalyticsOverview

# A user with no seeded/derived analytics doc yet (no completed sessions) sees a
# zero-value overview rather than a 404 — there is genuinely nothing to report.
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


class AnalyticsService:
    def __init__(self, analytics: AnalyticsRepository) -> None:
        self._analytics = analytics

    async def get_overview(self, user_id: str) -> AnalyticsOverview:
        doc = await self._analytics.get(user_id)
        return AnalyticsOverview(**(doc or _EMPTY_OVERVIEW))
