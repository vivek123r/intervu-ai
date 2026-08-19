from typing import ClassVar, Literal

from app.core.serialization import CamelModel
from app.schemas.common import Difficulty
from app.schemas.preparation import Question

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


class TurnDecision(CamelModel):
    omit_if_none: ClassVar[frozenset[str]] = frozenset({"follow_up"})

    score: float
    reasoning: str
    strengths: list[str]
    missing: list[str]
    action: TurnAction
    follow_up: FollowUpProposal | None = None
    transition: str
    difficulty_signal: DifficultySignal


from app.schemas.practice import PracticeConfig, SessionAnswer


class TurnContext(CamelModel):
    config: PracticeConfig
    question: Question
    transcript: str
    log: list[InterviewerLogEntry]
    answers_so_far: list[SessionAnswer]
    follow_ups_used_on_root: int
    follow_up_budget: int
    roots_remaining: int
