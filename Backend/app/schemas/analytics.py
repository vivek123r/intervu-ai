from app.core.serialization import CamelModel
from app.core.timeutils import UtcDatetime
from app.schemas.common import TopicRelevance


class TopicMetric(CamelModel):
    topic: str
    score: int
    trend: int
    relevance: TopicRelevance


class AnalyticsMicroMetric(CamelModel):
    key: str
    label: str
    value: float
    delta: str
    trend: list[int]


class AnalyticsRecentSession(CamelModel):
    report_id: str
    company: str
    mode: str
    score: int
    completed_at: UtcDatetime


class AnalyticsOverview(CamelModel):
    overall_score: int
    readiness_score: int
    streak_days: int
    improvement_percent: int
    score_trend: list[int]
    readiness_trend: list[int]
    micro_metrics: list[AnalyticsMicroMetric]
    topic_performance: list[TopicMetric]
    recent_sessions: list[AnalyticsRecentSession]
