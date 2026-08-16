from typing import Any

from app.core.ids import IdPrefix, new_id
from app.core.timeutils import utcnow
from app.errors.codes import ErrorCode
from app.errors.exceptions import NotFoundError
from app.repositories.preparation import (
    PreparationPlanRepository,
    PreparationTaskRepository,
    QuestionRepository,
)
from app.schemas.preparation import (
    PreparationPlan,
    PreparationTask,
    PreparationTimelineStep,
    Question,
    UpdateTaskStatusRequest,
)

# Deterministic content for any interview's generated plan — real AI-driven
# generation is out of scope here (see app/ai/provider.py) and gets swapped in later.
_TASK_TEMPLATE: list[dict[str, Any]] = [
    {
        "day": 1,
        "date_label": "Today",
        "phase": "Foundation",
        "category": "Databases",
        "title": "Review transaction isolation",
        "description": (
            "Explain dirty, non-repeatable, and phantom reads with one production example."
        ),
        "estimated_minutes": 12,
        "priority": "high",
    },
    {
        "day": 1,
        "date_label": "Today",
        "phase": "Foundation",
        "category": "Databases",
        "title": "Practice ACID trade-offs",
        "description": "Answer five prompts and name the operational cost of stronger guarantees.",
        "estimated_minutes": 14,
        "priority": "high",
    },
    {
        "day": 1,
        "date_label": "Today",
        "phase": "Foundation",
        "category": "System design",
        "title": "Defend a cache strategy",
        "description": "Cover invalidation, stampedes, stale reads, and graceful Redis failure.",
        "estimated_minutes": 18,
        "priority": "high",
    },
    {
        "day": 1,
        "date_label": "Today",
        "phase": "Foundation",
        "category": "Behavioral",
        "title": "Tighten one impact story",
        "description": "Add a measurable result to a concrete incident-response example.",
        "estimated_minutes": 10,
        "priority": "normal",
    },
    {
        "day": 1,
        "date_label": "Today",
        "phase": "Foundation",
        "category": "Mock",
        "title": "Complete a 10-minute pressure test",
        "description": "Use hard difficulty and focus on the role's core technical areas.",
        "estimated_minutes": 10,
        "priority": "high",
    },
    {
        "day": 2,
        "date_label": "Tomorrow",
        "phase": "Company + role",
        "category": "Company",
        "title": "Map the role to your strongest evidence",
        "description": "Connect three job requirements to concrete work from your resume.",
        "estimated_minutes": 20,
        "priority": "normal",
    },
    {
        "day": 3,
        "date_label": "Day 3",
        "phase": "Core technical",
        "category": "System design",
        "title": "Design a resilient job queue",
        "description": "Practice constraints, delivery semantics, retries, and observability.",
        "estimated_minutes": 30,
        "priority": "high",
    },
    {
        "day": 4,
        "date_label": "Interview day",
        "phase": "Warm-up",
        "category": "Warm-up",
        "title": "Run the calm-start protocol",
        "description": "One concise story, one architecture trade-off, then stop preparing.",
        "estimated_minutes": 8,
        "priority": "normal",
    },
]

_QUESTION_TEMPLATE: list[dict[str, Any]] = [
    {
        "text": "Walk me through a time you used caching to reduce load, including what you "
        "cached and how you kept it correct.",
        "category": "Technical",
        "topic": "Caching",
        "difficulty": "hard",
    },
    {
        "text": "Design a background-job system that can tolerate worker failures without "
        "processing the same task twice.",
        "category": "System design",
        "topic": "Distributed systems",
        "difficulty": "hard",
    },
    {
        "text": "Tell me about a production incident where your first hypothesis was wrong. "
        "How did you recover?",
        "category": "Behavioral",
        "topic": "Ownership",
        "difficulty": "normal",
    },
    {
        "text": "When can adding a database index make a system slower, and how would you "
        "validate the trade-off?",
        "category": "Technical",
        "topic": "Databases",
        "difficulty": "hard",
    },
]

_TIMELINE_TEMPLATE: list[dict[str, Any]] = [
    {"day": 1, "label": "Day 1", "phase": "Foundation", "status": "active"},
    {"day": 2, "label": "Day 2", "phase": "Company + role", "status": "upcoming"},
    {"day": 3, "label": "Day 3", "phase": "Core technical", "status": "upcoming"},
    {"day": 4, "label": "Day 4", "phase": "Mock + weak areas", "status": "upcoming"},
    {"day": 5, "label": "Interview", "phase": "Warm-up", "status": "upcoming"},
]


class PreparationService:
    def __init__(
        self,
        tasks: PreparationTaskRepository,
        questions: QuestionRepository,
        plans: PreparationPlanRepository,
    ) -> None:
        self._tasks = tasks
        self._questions = questions
        self._plans = plans

    async def get_plan(self, interview_id: str) -> PreparationPlan:
        tasks = await self._tasks.list_for_interview(interview_id)
        questions = await self._questions.list_for_interview(interview_id)
        plan = await self._plans.get(interview_id)
        timeline = plan["timeline"] if plan else []
        return PreparationPlan(
            tasks=[PreparationTask(**t) for t in tasks],
            questions=[Question(**q) for q in questions],
            timeline=[PreparationTimelineStep(**s) for s in timeline],
        )

    async def list_due_today(self, user_id: str) -> list[PreparationTask]:
        docs = await self._tasks.list_due_today_for_user(user_id)
        return [PreparationTask(**d) for d in docs]

    async def delete_all_for_interview(self, interview_id: str) -> None:
        await self._tasks.delete_for_interview(interview_id)
        await self._questions.delete_for_interview(interview_id)
        await self._plans.delete(interview_id)

    async def generate_plan(self, user_id: str, interview_id: str) -> None:
        await self._tasks.delete_for_interview(interview_id)
        await self._questions.delete_for_interview(interview_id)

        task_docs = [
            {
                **task,
                "id": new_id(IdPrefix.TASK),
                "interview_id": interview_id,
                "user_id": user_id,
                "status": "pending",
            }
            for task in _TASK_TEMPLATE
        ]
        question_docs = [
            {
                **question,
                "id": new_id(IdPrefix.QUESTION),
                "interview_id": interview_id,
                "user_id": user_id,
                "follow_up": None,
            }
            for question in _QUESTION_TEMPLATE
        ]
        await self._tasks.insert_many(task_docs)
        await self._questions.insert_many(question_docs)
        plan_doc = {"user_id": user_id, "timeline": _TIMELINE_TEMPLATE, "generated_at": utcnow()}
        await self._plans.upsert(interview_id, plan_doc)

    async def update_task_status(
        self, user_id: str, task_id: str, request: UpdateTaskStatusRequest
    ) -> PreparationTask:
        doc = await self._tasks.update_status(user_id, task_id, request.status)
        if doc is None:
            raise NotFoundError(ErrorCode.TASK_NOT_FOUND, "That task could not be found.")
        return PreparationTask(**doc)
