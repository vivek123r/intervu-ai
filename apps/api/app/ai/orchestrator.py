from __future__ import annotations

from pydantic import BaseModel

from app.ai.agents import StructuredAgent
from app.ai.context import InterviewContext
from app.ai.prompts import PROMPTS
from app.ai.provider.base import AIProvider
from app.ai.schemas import (
    AnswerEvaluationOutput,
    FinalReportCoaching,
    FollowUpDecision,
    GeneratedQuestion,
    InterviewClassification,
    JobDescriptionAnalysis,
    PreparationPlanOutput,
    ResumeAnalysis,
)
from app.config import Settings
from app.exceptions import AIInvalidResponse


class AIOrchestrator:
    def __init__(self, provider: AIProvider, settings: Settings) -> None:
        self._provider = provider
        self._settings = settings

    async def classify_calendar_event(self, event: dict[str, object]) -> InterviewClassification:
        return await self._run(
            "classifier", InterviewClassification, "classification", {"event": event}
        )

    async def analyze_resume(self, raw_text: str) -> ResumeAnalysis:
        return await self._run(
            "resume", ResumeAnalysis, "analysis", {"untrusted_resume_document": raw_text}
        )

    async def analyze_job_description(self, raw_text: str) -> JobDescriptionAnalysis:
        return await self._run(
            "job_description",
            JobDescriptionAnalysis,
            "analysis",
            {"untrusted_job_description": raw_text},
        )

    async def create_preparation_plan(self, context: dict[str, object]) -> PreparationPlanOutput:
        return await self._run("preparation", PreparationPlanOutput, "preparation", context)

    async def generate_question(self, context: InterviewContext) -> GeneratedQuestion:
        return await self._run("question", GeneratedQuestion, "interview", context.minimal_dict())

    async def evaluate_answer(self, context: dict[str, object]) -> AnswerEvaluationOutput:
        return await self._run("evaluation", AnswerEvaluationOutput, "interview", context)

    async def decide_followup(self, context: dict[str, object]) -> FollowUpDecision:
        return await self._run("followup", FollowUpDecision, "interview", context)

    async def generate_final_report(self, context: dict[str, object]) -> FinalReportCoaching:
        return await self._run("report", FinalReportCoaching, "analysis", context)

    async def _run[OutputT: BaseModel](
        self,
        prompt_key: str,
        schema: type[OutputT],
        workload: str,
        context: dict[str, object],
    ) -> OutputT:
        prompt = PROMPTS[prompt_key]
        agent = StructuredAgent(
            provider=self._provider,
            prompt=prompt,
            output_schema=schema,
            model=self._settings.model_for(workload),  # type: ignore[arg-type]
        )
        response = await agent.run(context)
        if response.parsed is None:
            raise AIInvalidResponse(details={"prompt_version": prompt.id})
        return response.parsed
