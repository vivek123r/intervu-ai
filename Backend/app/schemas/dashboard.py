from app.core.serialization import CamelModel
from app.schemas.analytics import TopicMetric
from app.schemas.interviews import Interview
from app.schemas.preparation import PreparationTask


class DashboardOverview(CamelModel):
    next_interview: Interview | None
    upcoming_interviews: list[Interview]
    today_tasks: list[PreparationTask]
    weak_topics: list[TopicMetric]
    streak_days: int
    score_trend: list[int]
    readiness_delta_this_week: int
