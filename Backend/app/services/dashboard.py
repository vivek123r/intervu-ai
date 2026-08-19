from app.core.timeutils import utcnow
from app.schemas.common import InterviewStatus
from app.schemas.dashboard import DashboardOverview
from app.services.analytics import AnalyticsService
from app.services.interviews import InterviewService
from app.services.preparation import PreparationService

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
        now = utcnow()

        # Only select interviews that are scheduled in the future and not completed/cancelled
        upcoming_interviews = [
            i
            for i in interviews
            if i.scheduled_at >= now
            and i.status not in (InterviewStatus.COMPLETED, InterviewStatus.CANCELLED)
        ]
        upcoming_interviews.sort(key=lambda interview: interview.scheduled_at)

        today_tasks = await self._preparation.list_due_today(user_id)
        overview = await self._analytics.get_overview(user_id)
        weak_topics = sorted(overview.topic_performance, key=lambda topic: topic.score)[:3]

        if not overview.recent_sessions or len(overview.readiness_trend) < 2:
            readiness_delta = 0
        else:
            readiness_delta = max(0, overview.readiness_trend[-1] - overview.readiness_trend[0])

        return DashboardOverview(
            next_interview=upcoming_interviews[0] if upcoming_interviews else None,
            upcoming_interviews=upcoming_interviews[:3],
            today_tasks=today_tasks,
            weak_topics=weak_topics,
            streak_days=overview.streak_days,
            score_trend=overview.score_trend,
            readiness_delta_this_week=readiness_delta,
        )
