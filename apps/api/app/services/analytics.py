from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime, timedelta
from itertools import pairwise
from statistics import fmean

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.scoring import readiness_score
from app.models.enums import SessionStatus
from app.models.preparation import PreparationPlan
from app.models.session import InterviewReport, MockInterviewSession, SpeechMetrics
from app.models.user import User
from app.repositories.practice import PracticeRepository
from app.schemas.analytics import AnalyticsOverview, TopicMetric, TrendPoint


class AnalyticsService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.practice = PracticeRepository(session)

    async def overview(self, user: User) -> AnalyticsOverview:
        sessions = await self.practice.list_sessions(user.id, limit=100)
        completed = [item for item in sessions if item.status == SessionStatus.COMPLETED]
        reports: list[InterviewReport] = []
        metrics: list[SpeechMetrics] = []
        for item in completed:
            report = await self.practice.report_for_session(item.id)
            speech = await self.practice.metrics_for_session(item.id)
            if report:
                reports.append(report)
            if speech:
                metrics.append(speech)
        scores = [report.overall_score for report in reports]
        overall = round(fmean(scores), 1) if scores else 0.0
        prep_progress = list(
            await self.session.scalars(
                select(PreparationPlan.overall_progress).where(PreparationPlan.user_id == user.id)
            )
        )
        readiness, _ = readiness_score(
            {
                "mock_performance": scores[-1] if scores else 0,
                "target_skill_coverage": self._mean_dimension(reports, "technical_score"),
                "preparation_completion": fmean(prep_progress) if prep_progress else 0,
                "recent_improvement": max(0, self._improvement(scores) + 50),
                "weak_topic_coverage": self._mean_dimension(reports, "depth_score"),
            }
        )
        return AnalyticsOverview(
            overall_score=overall,
            readiness_score=readiness,
            streak_days=self._streak(completed),
            improvement_percent=self._improvement(scores),
            total_practice_minutes=round(
                sum(
                    (item.ended_at - item.started_at).total_seconds()
                    for item in completed
                    if item.started_at and item.ended_at
                )
                / 60
            ),
            questions_answered=sum(item.question_count for item in completed),
            trend=self._trend(completed, reports),
            skills={
                "Technical": self._mean_dimension(reports, "technical_score"),
                "Communication": self._mean_dimension(reports, "communication_score"),
                "Problem Solving": self._mean_dimension(reports, "depth_score"),
                "Structure": self._mean_dimension(reports, "structure_score"),
                "Clarity": self._mean_dimension(reports, "clarity_score"),
                "Pace": self._pace_score(metrics),
            },
            topics=self._topics(reports),
            speech={
                "average_wpm": round(fmean(item.average_wpm for item in metrics), 1)
                if metrics
                else 0,
                "filler_words": round(fmean(item.filler_count for item in metrics), 1)
                if metrics
                else 0,
                "long_pauses": round(fmean(item.long_pause_count for item in metrics), 1)
                if metrics
                else 0,
            },
        )

    @staticmethod
    def _mean_dimension(reports: list[InterviewReport], field: str) -> float:
        return (
            round(fmean(float(getattr(report, field)) for report in reports), 1) if reports else 0.0
        )

    @staticmethod
    def _improvement(scores: list[float]) -> float:
        if len(scores) < 2:
            return 0.0
        baseline = fmean(scores[: min(3, len(scores))])
        recent = fmean(scores[-min(3, len(scores)) :])
        return round(recent - baseline, 1)

    @staticmethod
    def _streak(sessions: list[MockInterviewSession]) -> int:
        practiced_dates = sorted(
            {(item.ended_at or item.created_at).astimezone(UTC).date() for item in sessions},
            reverse=True,
        )
        if not practiced_dates:
            return 0
        today = datetime.now(UTC).date()
        if practiced_dates[0] not in {today, today - timedelta(days=1)}:
            return 0
        streak = 1
        for previous, current in pairwise(practiced_dates):
            if previous - current != timedelta(days=1):
                break
            streak += 1
        return streak

    @staticmethod
    def _trend(
        sessions: list[MockInterviewSession], reports: list[InterviewReport]
    ) -> list[TrendPoint]:
        reports_by_session = {report.session_id: report for report in reports}
        points: list[TrendPoint] = []
        for item in sorted(sessions, key=lambda session: session.created_at)[-12:]:
            report = reports_by_session.get(item.id)
            if report:
                points.append(
                    TrendPoint(
                        label=(item.ended_at or item.created_at).strftime("%d %b"),
                        overall=report.overall_score,
                        readiness=report.overall_score,
                    )
                )
        return points

    @staticmethod
    def _topics(reports: list[InterviewReport]) -> list[TopicMetric]:
        values: dict[str, list[float]] = defaultdict(list)
        for report in reports:
            for item in report.weak_topics:
                topic = str(item.get("topic") or "General")
                raw_score = item.get("score")
                values[topic].append(
                    float(raw_score) if isinstance(raw_score, int | float) else 0.0
                )
        topics = [
            TopicMetric(
                topic=topic,
                attempts=len(scores),
                score=round(fmean(scores), 1),
                trend=round(scores[-1] - scores[0], 1) if len(scores) > 1 else 0,
                priority=round((100 - scores[-1]) * (1 + 1 / max(1, len(scores))), 1),
            )
            for topic, scores in values.items()
        ]
        return sorted(topics, key=lambda item: item.priority, reverse=True)

    @staticmethod
    def _pace_score(metrics: list[SpeechMetrics]) -> float:
        if not metrics:
            return 0.0
        scores = [100 - min(100, abs(item.average_wpm - 137) * 1.5) for item in metrics]
        return round(fmean(scores), 1)
