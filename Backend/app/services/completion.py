"""Composes the post-interview completion view.

Nothing here is a new source of truth: the scores come from the report, the asked
questions and their timings from the practice session, the session's code/mode/standing
from the history log, and the authored copy (band, protocols, deltas) from a
`session_completions` document — or, when a session was just finished live and has no
authored document yet, from the AI seam's deterministic fallback. See
docs/API-CONTRACT.md's "Session completion" section for the wire shape this produces.
"""

from typing import Any

from app.ai.provider import AIProvider
from app.errors.codes import ErrorCode
from app.errors.exceptions import NotFoundError
from app.repositories.completions import CompletionInsightRepository
from app.repositories.history import HistoryRepository
from app.repositories.practice import PracticeSessionRepository
from app.repositories.reports import ReportRepository
from app.schemas.common import AnswerVerdict, Difficulty, MetricTone
from app.schemas.practice import (
    CompletionMetric,
    CompletionOverall,
    CompletionQuestion,
    GrowthProtocol,
    PracticeConfig,
    SessionCompletion,
    SignatureAxis,
    SpeechMetrics,
)

_REPORT_NOT_FOUND = "That report is not ready yet."

# (metric key, label, report field, signature benchmark). One tuple drives both the
# metric tiles and the signature chart so the two can never disagree about an axis.
_DIMENSIONS: tuple[tuple[str, str, str, int], ...] = (
    ("quality", "Answer quality", "technical", 90),
    ("relevance", "Relevance", "relevance", 88),
    ("structure", "Answer structure", "structure", 86),
    ("depth", "Depth", "depth", 86),
    ("communication", "Communication", "communication", 88),
    ("clarity", "Clarity", "clarity", 90),
)

# Value floor -> (band copy, tone). Highest floor first.
_METRIC_BANDS: tuple[tuple[int, str, MetricTone], ...] = (
    (90, "Exceptional", MetricTone.POSITIVE),
    (80, "Optimal", MetricTone.POSITIVE),
    (70, "Standard", MetricTone.NEUTRAL),
    (60, "Variable", MetricTone.CAUTION),
    (0, "Needs work", MetricTone.CRITICAL),
)

# Answer score (out of 10) floor -> verdict.
_VERDICTS: tuple[tuple[float, AnswerVerdict], ...] = (
    (8.0, AnswerVerdict.STRONG),
    (7.0, AnswerVerdict.SOLID),
    (0.0, AnswerVerdict.NEEDS_WORK),
)


def _band_for(value: int) -> tuple[str, MetricTone]:
    return next((band, tone) for floor, band, tone in _METRIC_BANDS if value >= floor)


def _verdict_for(score: float) -> AnswerVerdict:
    return next(verdict for floor, verdict in _VERDICTS if score >= floor)


def _mode_for(config: PracticeConfig) -> str:
    return f"{config.type.value.replace('_', ' ').capitalize()} mock"


class CompletionService:
    def __init__(
        self,
        reports: ReportRepository,
        sessions: PracticeSessionRepository,
        history: HistoryRepository,
        insights: CompletionInsightRepository,
        ai: AIProvider,
    ) -> None:
        self._reports = reports
        self._sessions = sessions
        self._history = history
        self._insights = insights
        self._ai = ai

    async def get_by_report_id(self, user_id: str, report_id: str) -> SessionCompletion:
        report = await self._reports.get_by_id(user_id, report_id)
        if report is None:
            raise NotFoundError(ErrorCode.REPORT_NOT_FOUND, _REPORT_NOT_FOUND)
        return await self._compose(user_id, report)

    async def get_by_session_id(self, user_id: str, session_id: str) -> SessionCompletion:
        report = await self._reports.get_by_session_id(user_id, session_id)
        if report is None:
            raise NotFoundError(ErrorCode.REPORT_NOT_FOUND, _REPORT_NOT_FOUND)
        return await self._compose(user_id, report)

    async def _compose(self, user_id: str, report: dict[str, Any]) -> SessionCompletion:
        report_id = report["id"]
        session_id = report["session_id"]
        session = await self._sessions.get(user_id, session_id)
        config = PracticeConfig(**session["config"]) if session else None
        history_rows = await self._history.list_for_user(user_id)
        insight = await self._insights.get(user_id, report_id) or self._derive_insight(
            config, report
        )

        row = next((entry for entry in history_rows if entry.get("report_id") == report_id), None)
        overall = int(report["overall"])

        return SessionCompletion(
            report_id=report_id,
            session_id=session_id,
            code=row["code"] if row else f"IVU-{report_id.split('-')[-1][-4:].upper()}",
            role=config.role if config else (row["role"] if row else "Practice interview"),
            company=config.company if config else (row["company"] if row else "Self-directed"),
            mode=row["mode"] if row else (_mode_for(config) if config else "Practice mock"),
            completed_at=report["created_at"],
            duration_minutes=(
                row["duration_minutes"] if row else (config.duration if config else 0)
            ),
            questions_answered=len(report["answers"]),
            overall=CompletionOverall(
                score=overall,
                band=insight["band"],
                top_percent=insight["top_percent"],
                delta_from_previous=self._delta_from_previous(history_rows, row),
                caption=insight["caption"],
            ),
            summary=report["summary"],
            signature=[
                SignatureAxis(
                    key=key, label=label, value=int(report[field]), benchmark=benchmark
                )
                for key, label, field, benchmark in _DIMENSIONS
            ],
            metrics=[
                self._metric(key, label, int(report[field]), insight.get("metric_deltas", {}))
                for key, label, field, _ in _DIMENSIONS
            ],
            speech=SpeechMetrics(**report["speech"]),
            strengths=report["strengths"],
            protocols=[GrowthProtocol(**protocol) for protocol in insight["protocols"]],
            questions=self._questions(report, session),
        )

    def _derive_insight(
        self, config: PracticeConfig | None, report: dict[str, Any]
    ) -> dict[str, Any]:
        fallback = config or PracticeConfig(
            role="Practice interview",
            company="Self-directed",
            type="technical",
            difficulty="normal",
            duration=0,
            focus_areas=[],
            interviewer_style="Senior engineer",
        )
        return self._ai.generate_completion_insights(fallback, report)

    @staticmethod
    def _metric(
        key: str, label: str, value: int, deltas: dict[str, str]
    ) -> CompletionMetric:
        band, tone = _band_for(value)
        return CompletionMetric(
            key=key, label=label, value=value, band=band, tone=tone, delta=deltas.get(key)
        )

    @staticmethod
    def _delta_from_previous(
        history_rows: list[dict[str, Any]], row: dict[str, Any] | None
    ) -> int:
        """This session's score against the last completed one before it — both read off
        the history log, so the two are always on the same scale. 0 when there is no
        history row for this report (a session finished live is not logged yet) or no
        earlier completed session to compare against."""
        if row is None:
            return 0
        # list_for_user returns newest first, so everything after this row is older.
        older = history_rows[history_rows.index(row) + 1 :]
        previous = next(
            (entry for entry in older if entry["status"] == "completed"),
            None,
        )
        return 0 if previous is None else int(row["score"]) - int(previous["score"])

    @staticmethod
    def _questions(
        report: dict[str, Any], session: dict[str, Any] | None
    ) -> list[CompletionQuestion]:
        """Answer reviews carry the question text but no topic or timing — those come
        from the session that asked them, matched by position (the report is generated
        from the session's answers in order). A report whose session has been deleted
        still renders, with the question metadata left neutral."""
        asked = (session or {}).get("questions", [])
        answered = (session or {}).get("answers", [])

        questions = []
        for index, review in enumerate(report["answers"]):
            question = asked[index] if index < len(asked) else {}
            answer = answered[index] if index < len(answered) else {}
            score = float(review["score"])
            questions.append(
                CompletionQuestion(
                    id=question.get("id") or f"{report['id']}-answer-{index + 1}",
                    position=index + 1,
                    question=review["question"],
                    topic=question.get("topic") or "General",
                    category=question.get("category") or "Interview",
                    difficulty=question.get("difficulty") or Difficulty.NORMAL,
                    score=score,
                    duration_seconds=int(answer.get("duration_seconds", 0)),
                    verdict=_verdict_for(score),
                    answer=review["answer"],
                    strengths=review["strengths"],
                    missing=review["missing"],
                    better_structure=review["better_structure"],
                )
            )
        return questions
