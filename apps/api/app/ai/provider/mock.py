from __future__ import annotations

import json
from time import perf_counter

from pydantic import BaseModel

from app.ai.provider.base import AIMessage, AIResponse, AIUsageData, SchemaT
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


class MockAIProvider:
    """Deterministic development provider; never requires network access."""

    provider_name = "mock"
    model_name = "intervu/mock-v1"

    async def generate(
        self,
        messages: list[AIMessage],
        *,
        schema: type[SchemaT] | None = None,
        temperature: float | None = None,
        model: str | None = None,
    ) -> AIResponse[SchemaT]:
        del temperature
        started = perf_counter()
        parsed = self._fixture(schema, messages) if schema else None
        content = parsed.model_dump_json() if parsed else "Mock response"
        return AIResponse(
            content=content,
            parsed=parsed,
            provider=self.provider_name,
            model=model or self.model_name,
            latency_ms=max(8, round((perf_counter() - started) * 1000)),
            usage=AIUsageData(
                input_tokens=sum(len(message.content.split()) for message in messages)
            ),
        )

    def _fixture(self, schema: type[SchemaT], messages: list[AIMessage]) -> SchemaT:
        joined = " ".join(message.content.lower() for message in messages)
        data: BaseModel
        if schema is InterviewClassification:
            data = InterviewClassification(
                is_interview=True,
                confidence=0.94,
                company="Acme Labs",
                role="Backend Engineer",
                round="Technical Round 2",
                interview_type="technical",
                meeting_platform="Google Meet",
            )
        elif schema is ResumeAnalysis:
            data = ResumeAnalysis(
                skills=["Node.js", "TypeScript", "PostgreSQL", "Redis", "Docker", "REST APIs"],
                experience=[
                    {
                        "company": "Northstar Systems",
                        "role": "Backend Engineer",
                        "highlights": [
                            "Reduced API p95 latency by 34%",
                            "Designed idempotent payment workers",
                        ],
                        "technologies": ["Node.js", "PostgreSQL", "Redis"],
                    }
                ],
                projects=[
                    {
                        "name": "Event ingestion platform",
                        "summary": "Processed high-volume webhook traffic with durable retries.",
                        "technologies": ["TypeScript", "Redis", "PostgreSQL"],
                    }
                ],
                education=[
                    {"degree": "B.Tech Computer Science", "institution": "Sample University"}
                ],
                certifications=["AWS Certified Developer - Associate"],
                achievements=["Improved service reliability from 99.7% to 99.95%"],
            )
        elif schema is JobDescriptionAnalysis:
            data = JobDescriptionAnalysis(
                required_skills=["Node.js", "SQL", "REST APIs", "System Design"],
                preferred_skills=["Docker", "AWS", "Redis"],
                responsibilities=[
                    "Design resilient backend services",
                    "Own database performance and API reliability",
                ],
                experience_requirements=["3+ years building production backend systems"],
                seniority="mid-level",
                technologies=["Node.js", "PostgreSQL", "Redis", "Docker", "AWS"],
                likely_interview_areas=["System Design", "SQL Transactions", "Caching", "APIs"],
                keywords=["reliability", "scalability", "ownership", "observability"],
            )
        elif schema is PreparationPlanOutput:
            data = PreparationPlanOutput(
                focus_summary="Close the SQL and system-design gaps while rehearsing resume evidence.",
                tasks=[
                    {
                        "day_offset": 0,
                        "category": "technical",
                        "title": "Isolation levels without hand-waving",
                        "description": "Explain dirty, non-repeatable, and phantom reads using one concrete transaction.",
                        "estimated_minutes": 18,
                        "priority": 1,
                    },
                    {
                        "day_offset": 0,
                        "category": "resume",
                        "title": "Defend the Redis decision",
                        "description": "Practice cache invalidation, fallback behavior, and measurable impact.",
                        "estimated_minutes": 12,
                        "priority": 1,
                    },
                    {
                        "day_offset": 1,
                        "category": "system_design",
                        "title": "Design a resilient notification service",
                        "description": "Cover queues, idempotency, retries, and observability tradeoffs.",
                        "estimated_minutes": 30,
                        "priority": 2,
                    },
                    {
                        "day_offset": 2,
                        "category": "mock",
                        "title": "Technical round simulation",
                        "description": "Complete a 25-minute adaptive mock and retry weak answers.",
                        "estimated_minutes": 25,
                        "priority": 1,
                    },
                ],
            )
        elif schema is GeneratedQuestion:
            topic = "SQL Transactions" if "sql" in joined else "Caching"
            text = (
                "Two concurrent requests update the same account balance. How would you preserve correctness without serializing every transaction?"
                if topic == "SQL Transactions"
                else "You mentioned Redis for caching. How did you invalidate stale data, and what happened if Redis was unavailable?"
            )
            data = GeneratedQuestion(
                text=text,
                question_type="technical",
                topic=topic,
                difficulty="hard",
                rationale="Tests production tradeoffs and failure-mode depth.",
            )
        elif schema is AnswerEvaluationOutput:
            data = AnswerEvaluationOutput(
                correctness=84,
                completeness=72,
                relevance=91,
                depth=74,
                structure=78,
                clarity=86,
                strengths=[
                    "Identified the primary reliability tradeoff",
                    "Used an appropriate production example",
                ],
                missing_points=["Explicit fallback behavior", "Operational monitoring signal"],
                recommendations=["State the failure mode before describing the mechanism"],
                improved_structure=[
                    "Define the constraint",
                    "Describe the normal path",
                    "Explain the failure path",
                    "Name the tradeoff and observable metric",
                ],
            )
        elif schema is FollowUpDecision:
            data = FollowUpDecision(
                action="follow_up",
                reason="The answer named Redis but did not explain the failure path.",
                question="What would the application do if Redis became unavailable during peak traffic?",
            )
        elif schema is FinalReportCoaching:
            data = FinalReportCoaching(
                strengths=[
                    "Strong production examples anchored technical answers",
                    "Concise explanations stayed relevant to the question",
                ],
                weaknesses=[
                    "Failure modes were often mentioned without operational detail",
                    "Behavioral results need more measurable outcomes",
                ],
                weak_topics=[
                    {
                        "topic": "SQL Transactions",
                        "score": 68,
                        "reason": "Isolation and locking tradeoffs were incomplete.",
                    },
                    {
                        "topic": "System Design",
                        "score": 72,
                        "reason": "Observability and degradation paths need more depth.",
                    },
                ],
                recommended_actions=[
                    {
                        "title": "Retry transaction answers",
                        "description": "Practice two focused concurrency questions using a five-part structure.",
                        "estimated_minutes": 12,
                        "topic": "SQL Transactions",
                    }
                ],
                summary="A technically credible interview with clear examples. The fastest improvement is to make failure paths and measurable results explicit.",
            )
        else:
            schema_json = schema.model_json_schema()
            raise ValueError(f"No mock fixture registered for {json.dumps(schema_json)[:120]}")
        return schema.model_validate(data.model_dump())
