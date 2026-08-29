from typing import Any, Protocol

from app.schemas.interviewer import (
    AnswerAnalysis,
    AnswerAnalysisContext,
    InterviewerLogEntry,
    TurnContext,
    TurnRouting,
)
from app.schemas.practice import PracticeConfig, SessionAnswer
from app.schemas.preparation import Question


class AIProvider(Protocol):
    """The seam real AI work plugs into — app/ai/mock.py implements every method
    deterministically. Swap the binding in app/dependencies.py once a real
    provider exists; nothing else in the practice domain needs to change."""

    async def generate_first_question(
        self,
        config: PracticeConfig,
        resume_context: dict[str, Any] | None = None,
    ) -> Question:
        """Generate the dynamic starting question for a practice session."""
        ...

    async def fallback_next_root(
        self,
        config: PracticeConfig,
        topics_covered: list[str],
        recent_scores: list[float],
    ) -> Question:
        """Deterministic fallback for next root question when model proposal is unavailable."""
        ...

    async def generate_questions(
        self,
        config: PracticeConfig,
        count: int,
        resume_context: dict[str, Any] | None = None,
    ) -> list[Question]:
        """The ordered question bank for a new practice session, optionally informed by resume."""
        ...

    async def next_turn(self, ctx: TurnContext) -> TurnRouting:
        """The fast routing decision: decides whether to probe deeper (follow-up),
        proposes the next question, and speaks a persona-aware transition line.
        Deliberately produces no scoring rubric, so it stays on the critical path —
        the candidate hears the next question without waiting on `analyze_answer`."""
        ...

    async def analyze_answer(self, ctx: AnswerAnalysisContext) -> AnswerAnalysis:
        """Background scoring/behavioural analysis for one already-answered question —
        score, strengths, missing, and difficulty trajectory. Runs after `next_turn`
        already let the candidate move on; see services/analysis.py."""
        ...

    async def generate_opening(
        self,
        config: PracticeConfig,
        resume_context: dict[str, Any] | None = None,
    ) -> str:
        """Spoken opening introduction line by the interviewer persona."""
        ...

    async def generate_wrap_up(
        self,
        config: PracticeConfig,
        answers: list[SessionAnswer],
        log: list[InterviewerLogEntry],
    ) -> str:
        """Spoken wrap-up line by the interviewer persona summarizing overall performance."""
        ...

    async def generate_report(
        self,
        config: PracticeConfig,
        answers: list[SessionAnswer],
        interviewer_log: list[InterviewerLogEntry] | None = None,
    ) -> dict[str, Any]:
        """Every InterviewReport field except id/sessionId/createdAt, which the
        service stamps on after persisting."""
        ...

    async def parse_resume(self, text: str) -> dict[str, Any]:
        """Extract skills, summary, key highlights, experience points, and domain strengths."""
        ...

    async def generate_completion_insights(
        self, config: PracticeConfig, report: dict[str, Any]
    ) -> dict[str, Any]:
        """The authored half of the completion view — `band`, `top_percent`, `caption`,
        and prioritised `protocols` — for a report that has no stored insight document.
        Same shape as a `session_completions` record, minus its ownership keys."""
        ...

    async def answer_report_question(
        self,
        config: PracticeConfig,
        report: dict[str, Any],
        question_context: dict[str, Any] | None,
        history: list[dict[str, str]],
        message: str,
    ) -> str:
        """Grounded, voice-first Q&A about a completed report — "why this score",
        "what would a better answer look like". `question_context`, when given, is
        the single report answer (question/answer/score/ai_comment/...) the
        candidate is asking about; `history` is prior turns in this thread as
        `{speaker, text}` pairs, oldest first."""
        ...
