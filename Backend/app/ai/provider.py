from typing import Any, Protocol

from app.schemas.practice import PracticeConfig, SessionAnswer
from app.schemas.preparation import Question


class AIProvider(Protocol):
    """The seam real AI work plugs into — app/ai/mock.py implements every method
    deterministically. Swap the binding in app/dependencies.py once a real
    provider exists; nothing else in the practice domain needs to change."""

    def generate_questions(self, config: PracticeConfig, count: int) -> list[Question]:
        """The ordered question bank for a new practice session."""
        ...

    def score_answer(self, question: Question, transcript: str) -> float:
        """A 0-10 score for a single answer, computed as soon as it's submitted."""
        ...

    def generate_report(
        self, config: PracticeConfig, answers: list[SessionAnswer]
    ) -> dict[str, Any]:
        """Every InterviewReport field except id/sessionId/createdAt, which the
        service stamps on after persisting."""
        ...
