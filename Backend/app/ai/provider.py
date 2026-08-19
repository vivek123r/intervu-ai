from typing import Any, Protocol

from app.schemas.interviewer import InterviewerLogEntry, TurnContext, TurnDecision
from app.schemas.practice import PracticeConfig, SessionAnswer
from app.schemas.preparation import Question


class AIProvider(Protocol):
    """The seam real AI work plugs into — app/ai/mock.py implements every method
    deterministically. Swap the binding in app/dependencies.py once a real
    provider exists; nothing else in the practice domain needs to change."""

    async def generate_questions(
        self,
        config: PracticeConfig,
        count: int,
        resume_context: dict[str, Any] | None = None,
    ) -> list[Question]:
        """The ordered question bank for a new practice session, optionally informed by resume."""
        ...

    async def score_answer(self, question: Question, transcript: str) -> float:
        """A 0-10 score for a single answer, computed as soon as it's submitted."""
        ...

    async def interviewer_turn(self, ctx: TurnContext) -> TurnDecision:
        """The agentic brain turn: scores answer, evaluates conversation memory,
        decides whether to probe deeper (follow-up), speaks a persona-aware transition line,
        and signals difficulty trajectory."""
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

