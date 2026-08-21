from __future__ import annotations

from typing import TYPE_CHECKING, Any, ClassVar, Literal

from app.core.serialization import CamelModel
from app.schemas.common import Difficulty
from app.schemas.preparation import Question

if TYPE_CHECKING:
    from app.schemas.practice import PracticeConfig, SessionAnswer

InterviewerSpeaker = Literal["interviewer", "candidate"]
InterviewerKind = Literal["intro", "question", "answer", "transition", "wrap_up"]
TurnAction = Literal["follow_up", "advance"]
DifficultySignal = Literal["easier", "same", "harder"]


class InterviewerLogEntry(CamelModel):
    omit_if_none: ClassVar[frozenset[str]] = frozenset({"question_id"})

    speaker: InterviewerSpeaker
    kind: InterviewerKind
    text: str
    question_id: str | None = None


class FollowUpProposal(CamelModel):
    text: str
    topic: str
    difficulty: Difficulty


class QuestionProposal(CamelModel):
    text: str
    topic: str
    category: str
    difficulty: Difficulty


class TurnDecision(CamelModel):
    omit_if_none: ClassVar[frozenset[str]] = frozenset({"follow_up", "next_root"})

    score: float
    reasoning: str
    strengths: list[str]
    missing: list[str]
    action: TurnAction
    follow_up: FollowUpProposal | None = None
    next_root: QuestionProposal | None = None
    transition: str
    difficulty_signal: DifficultySignal


class TurnContext(CamelModel):
    config: PracticeConfig
    question: Question
    transcript: str
    log: list[InterviewerLogEntry]
    answers_so_far: list[SessionAnswer]
    follow_ups_used_on_root: int
    follow_up_budget: int
    roots_remaining: int
    planned_root_count: int = 0
    roots_asked: int = 0
    topics_covered: list[str] = []
    recent_scores: list[float] = []
    resume_context: dict[str, Any] | None = None


import app.schemas.practice  # noqa: E402, F401
