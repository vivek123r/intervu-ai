from app.schemas.dashboard import DashboardOverview
from app.services.analytics import AnalyticsService
from app.services.interviews import InterviewService
from app.services.preparation import PreparationService

# Matches Frontend/src/mocks/fixtures.ts's buildDashboardOverview exactly: nextInterview
# is the soonest-scheduled interview across ALL statuses (not filtered to "upcoming"),
# and upcomingInterviews is that same sorted list's first 3 — so nextInterview is also
# upcomingInterviews[0]. Real derivation is out of scope; this mirrors the fixed demo value.
READINESS_DELTA_THIS_WEEK = 11


class DashboardService:
    def __init__(
        self,
        interviews: InterviewService,
        preparation: PreparationService,
        analytics: AnalyticsService,
    ) -> None:
        self._interviews = interviews
        self._preparation = preparation
        self._analytics = analytics

    async def get_overview(self, user_id: str) -> DashboardOverview:
        interviews = await self._interviews.list_for_user(user_id)
        sorted_interviews = sorted(interviews, key=lambda interview: interview.scheduled_at)
        today_tasks = await self._preparation.list_due_today(user_id)
        overview = await self._analytics.get_overview(user_id)
        weak_topics = sorted(overview.topic_performance, key=lambda topic: topic.score)[:3]

        return DashboardOverview(
            next_interview=sorted_interviews[0] if sorted_interviews else None,
            upcoming_interviews=sorted_interviews[:3],
            today_tasks=today_tasks,
            weak_topics=weak_topics,
            streak_days=overview.streak_days,
            score_trend=overview.score_trend,
            readiness_delta_this_week=READINESS_DELTA_THIS_WEEK,
        )
