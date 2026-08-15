from typing import ClassVar

from app.core.serialization import CamelModel
from app.schemas.common import (
    Difficulty,
    PreparationTaskStatus,
    PreparationTimelineStatus,
    TaskPriority,
)


class PreparationTask(CamelModel):
    id: str
    day: int
    date_label: str
    phase: str
    category: str
    title: str
    description: str
    estimated_minutes: int
    status: PreparationTaskStatus
    priority: TaskPriority


class Question(CamelModel):
    omit_if_none: ClassVar[frozenset[str]] = frozenset({"follow_up"})

    id: str
    text: str
    category: str
    topic: str
    difficulty: Difficulty
    follow_up: bool | None = None


class PreparationTimelineStep(CamelModel):
    day: int
    label: str
    phase: str
    status: PreparationTimelineStatus


class PreparationPlan(CamelModel):
    tasks: list[PreparationTask]
    questions: list[Question]
    timeline: list[PreparationTimelineStep]


class UpdateTaskStatusRequest(CamelModel):
    status: PreparationTaskStatus
