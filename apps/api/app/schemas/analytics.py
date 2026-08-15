from __future__ import annotations

from pydantic import BaseModel


class TrendPoint(BaseModel):
    label: str
    overall: float
    readiness: float


class TopicMetric(BaseModel):
    topic: str
    attempts: int
    score: float
    trend: float
    priority: float


class AnalyticsOverview(BaseModel):
    overall_score: float
    readiness_score: float
    streak_days: int
    improvement_percent: float
    total_practice_minutes: int
    questions_answered: int
    trend: list[TrendPoint]
    skills: dict[str, float]
    topics: list[TopicMetric]
    speech: dict[str, float]
