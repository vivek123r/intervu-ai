from typing import Any

from app.ai.provider import derive_overall
from app.core.ids import IdPrefix, new_id
from app.schemas.common import Difficulty, InterviewType
from app.schemas.interviewer import (
    AnswerAnalysis,
    AnswerAnalysisContext,
    DifficultySignal,
    FollowUpProposal,
    InterviewerLogEntry,
    QuestionProposal,
    TurnAction,
    TurnContext,
    TurnRouting,
)
from app.schemas.practice import PracticeConfig, SessionAnswer
from app.schemas.preparation import Question
from app.services.speech_metrics import (
    compute_pause_metrics,
    compute_speaking_wpm,
    merge_filler_counts,
)

# A fixed, deterministic stand-in for real AI-driven question selection, scoring,
# and report generation — see app/ai/provider.py. None of this is content-aware.
_QUESTION_BANK: list[dict[str, str]] = [
    {
        "text": "Walk me through a time you used caching to reduce load, including what "
        "you cached and how you kept it correct.",
        "category": "Technical",
        "topic": "Caching",
        "difficulty": "hard",
        "type": "technical",
    },
    {
        "text": "Design a background-job system that can tolerate worker failures without "
        "processing the same task twice.",
        "category": "System design",
        "topic": "Distributed systems",
        "difficulty": "hard",
        "type": "system_design",
    },
    {
        "text": "Tell me about a production incident where your first hypothesis was "
        "wrong. How did you recover?",
        "category": "Behavioral",
        "topic": "Ownership",
        "difficulty": "normal",
        "type": "behavioral",
    },
    {
        "text": "When can adding a database index make a system slower, and how would "
        "you validate the trade-off?",
        "category": "Technical",
        "topic": "Databases",
        "difficulty": "hard",
        "type": "technical",
    },
    {
        "text": "How would you design rate limiting for a public API?",
        "category": "System design",
        "topic": "APIs",
        "difficulty": "normal",
        "type": "system_design",
    },
    {
        "text": "Describe a time you disagreed with a technical decision. What did you do?",
        "category": "Behavioral",
        "topic": "Collaboration",
        "difficulty": "easy",
        "type": "behavioral",
    },
    {
        "text": "What's the difference between optimistic and pessimistic locking, and "
        "when would you use each?",
        "category": "Technical",
        "topic": "Concurrency",
        "difficulty": "normal",
        "type": "technical",
    },
    {
        "text": "How do you decide when a service should be split apart versus kept together?",
        "category": "System design",
        "topic": "Architecture",
        "difficulty": "brutal",
        "type": "system_design",
    },
    {
        "text": "Why are you interested in this role, and what would success look like "
        "for you here after your first six months?",
        "category": "Hiring manager",
        "topic": "Motivation",
        "difficulty": "normal",
        "type": "hiring_manager",
    },
    {
        "text": "Tell me about a time you had to influence a decision without having "
        "direct authority over the people involved.",
        "category": "Hiring manager",
        "topic": "Leadership",
        "difficulty": "hard",
        "type": "hiring_manager",
    },
    {
        "text": "Walk me through your resume and what's driving your job search right now.",
        "category": "Recruiter screen",
        "topic": "Background",
        "difficulty": "easy",
        "type": "recruiter",
    },
    {
        "text": "What are you looking for in terms of compensation, and what's your "
        "availability to start?",
        "category": "Recruiter screen",
        "topic": "Logistics",
        "difficulty": "easy",
        "type": "recruiter",
    },
]


def _pool_for_type(interview_type: InterviewType) -> list[dict[str, str]]:
    """Restricts the deterministic bank to the selected interview type before any
    other filtering (difficulty, focus areas, uncovered topics) — otherwise a
    "behavioral" session can just as easily surface a system-design question,
    since nothing else in this file distinguishes between types."""
    pool = [q for q in _QUESTION_BANK if q["type"] == interview_type.value]
    return pool or _QUESTION_BANK

_DIFFICULTY_STEPS: list[Difficulty] = [
    Difficulty.EASY,
    Difficulty.NORMAL,
    Difficulty.HARD,
    Difficulty.BRUTAL,
]


def _step_difficulty(base: Difficulty, recent_scores: list[float]) -> Difficulty:
    if not recent_scores:
        return base
    mean_score = sum(recent_scores) / len(recent_scores)
    try:
        idx = _DIFFICULTY_STEPS.index(base)
    except ValueError:
        idx = 1
    if mean_score >= 8.0:
        idx = min(len(_DIFFICULTY_STEPS) - 1, idx + 1)
    elif mean_score <= 5.0:
        idx = max(0, idx - 1)
    return _DIFFICULTY_STEPS[idx]


def _quality_proxy(transcript: str) -> float:
    # If words < 18, score < 6.0 (e.g. 10 words -> 5.5), which deterministically
    # triggers a follow-up.
    words = len(transcript.split())
    return round(max(3.0, min(9.2, 4.5 + words / 10)), 1)


# Score -> headline band for the completion view's overall instrument, highest first.
_OVERALL_BANDS: tuple[tuple[int, str], ...] = (
    (90, "Exceptional"),
    (80, "Interview ready"),
    (70, "Building readiness"),
    (60, "Developing"),
    (0, "Early signal"),
)

_PROTOCOL_PRIORITIES = ("high", "medium", "low")


class DeterministicProvider:
    """Implements AIProvider with fixed, reproducible logic — no model calls."""

    async def generate_first_question(
        self,
        config: PracticeConfig,
        resume_context: dict[str, Any] | None = None,
    ) -> Question:
        # Match first bank entry where focus area matches or difficulty matches
        type_pool = _pool_for_type(config.type)
        focus_lower = [f.lower() for f in config.focus_areas]
        match = next(
            (
                q
                for q in type_pool
                if q["topic"].lower() in focus_lower or q["category"].lower() in focus_lower
            ),
            None,
        )
        if not match:
            match = next(
                (q for q in type_pool if q["difficulty"] == config.difficulty.value),
                type_pool[0],
            )
        return Question(
            id=new_id(IdPrefix.QUESTION),
            text=match["text"],
            category=match["category"],
            topic=match["topic"],
            difficulty=Difficulty(match["difficulty"]),
        )

    async def fallback_next_root(
        self,
        config: PracticeConfig,
        topics_covered: list[str],
        recent_scores: list[float],
    ) -> Question:
        target_diff = _step_difficulty(config.difficulty, recent_scores)
        type_pool = _pool_for_type(config.type)
        covered_set = {t.lower() for t in topics_covered}
        # Choose next bank question whose topic is not yet covered
        uncovered = [q for q in type_pool if q["topic"].lower() not in covered_set]
        pool = uncovered or type_pool
        # Pick matching target difficulty if possible, else rotate
        match = next((q for q in pool if q["difficulty"] == target_diff.value), pool[0])
        return Question(
            id=new_id(IdPrefix.QUESTION),
            text=match["text"],
            category=match["category"],
            topic=match["topic"],
            difficulty=target_diff,
        )

    async def generate_questions(
        self,
        config: PracticeConfig,
        count: int,
        resume_context: dict[str, Any] | None = None,
    ) -> list[Question]:
        type_pool = _pool_for_type(config.type)
        pool = [q for q in type_pool if q["difficulty"] == config.difficulty.value]
        pool = pool or type_pool
        selected = (pool * ((count // len(pool)) + 1))[:count]
        return [
            Question(
                id=new_id(IdPrefix.QUESTION),
                text=item["text"],
                category=item["category"],
                topic=item["topic"],
                difficulty=Difficulty(item["difficulty"]),
            )
            for item in selected
        ]

    async def next_turn(self, ctx: TurnContext) -> TurnRouting:
        # Cheap word-count proxy used only to route (follow-up vs advance, next
        # difficulty) — analyze_answer computes the real, persisted score separately.
        quality = _quality_proxy(ctx.transcript)
        can_follow_up = (
            quality < 6.0 and ctx.follow_ups_used_on_root < 2 and ctx.follow_up_budget > 0
        )

        action: TurnAction
        if can_follow_up:
            action = "follow_up"
            follow_up = FollowUpProposal(
                text=f"You mentioned {ctx.question.topic} — walk me through how that holds up under 10x load.",
                topic=ctx.question.topic,
                difficulty=ctx.question.difficulty,
            )
            transition = f"Let's explore that further. Walk me through the edge cases on {ctx.question.topic}."
        else:
            action = "advance"
            follow_up = None
            transition = f"Got it. Let's move to our next question on {ctx.config.role}."

        # Compute next root proposal
        scores_for_stepping = [*ctx.recent_scores, quality]
        target_diff = _step_difficulty(ctx.config.difficulty, scores_for_stepping)
        covered_set = {t.lower() for t in ctx.topics_covered}
        covered_set.add(ctx.question.topic.lower())
        type_pool = _pool_for_type(ctx.config.type)
        uncovered = [q for q in type_pool if q["topic"].lower() not in covered_set]
        pool = uncovered or type_pool
        # Rotate by roots asked
        idx = ctx.roots_asked % len(pool)
        candidate = pool[idx]
        next_root = QuestionProposal(
            text=candidate["text"],
            topic=candidate["topic"],
            category=candidate["category"],
            difficulty=target_diff,
        )

        return TurnRouting(
            action=action,
            follow_up=follow_up,
            next_root=next_root,
            transition=transition,
        )

    async def analyze_answer(self, ctx: AnswerAnalysisContext) -> AnswerAnalysis:
        score = _quality_proxy(ctx.transcript)
        diff_signal: DifficultySignal = (
            "easier" if score < 4.5 else "harder" if score >= 8.0 else "same"
        )
        return AnswerAnalysis(
            score=score,
            reasoning="Evaluated response based on length and core concept coverage.",
            strengths=["Addressed the core prompt directly"],
            missing=["Detailed trade-off analysis under scale"],
            difficulty_signal=diff_signal,
        )

    async def generate_opening(
        self,
        config: PracticeConfig,
        resume_context: dict[str, Any] | None = None,
    ) -> str:
        return (
            f"Hello and welcome. I'll be conducting your {config.role} interview for "
            f"{config.company} today. Let's get started."
        )

    async def generate_wrap_up(
        self,
        config: PracticeConfig,
        answers: list[SessionAnswer],
        log: list[InterviewerLogEntry],
    ) -> str:
        return (
            f"Thank you for your time today — that wraps up our {config.role} interview. "
            "I'm compiling your performance report now."
        )

    async def generate_report(
        self,
        config: PracticeConfig,
        answers: list[SessionAnswer],
        interviewer_log: list[InterviewerLogEntry] | None = None,
    ) -> dict[str, Any]:
        # Unscored answers (their background analysis failed) are excluded rather
        # than substituted with a neutral midpoint — see provider.derive_overall.
        # `InterviewReport.unscored_answer_count` reports the shortfall instead.
        overall = derive_overall(answers, fallback=70)

        total_words = sum(len(answer.transcript.split()) for answer in answers)
        total_seconds = sum(answer.duration_seconds for answer in answers)
        average_wpm = compute_speaking_wpm(
            total_words,
            total_seconds,
            [ms for answer in answers for ms in answer.pause_markers_ms],
        )

        fillers = merge_filler_counts([answer.transcript for answer in answers])
        long_pauses, longest_pause = compute_pause_metrics(
            [ms for answer in answers for ms in answer.pause_markers_ms]
        )

        return {
            # NOTE: these six dimensions are arithmetic offsets of `overall`, not an
            # independent assessment — this provider has no way to judge structure
            # separately from depth. `generated_offline` below tells the completion
            # view not to render them as a measured skill breakdown.
            "overall": overall,
            "technical": overall,
            "communication": overall,
            "structure": max(0, overall - 6),
            "clarity": min(100, overall + 4),
            "relevance": overall,
            "depth": max(0, overall - 3),
            "generated_offline": True,
            "summary": (
                "Your answers were clear and grounded in real examples. Structure them "
                "explicitly — decision, trade-off, outcome — to raise the next score."
            ),
            "speech": {
                "average_wpm": average_wpm,
                "filler_count": sum(fillers.values()),
                "fillers": fillers,
                "long_pauses": long_pauses,
                "longest_pause": longest_pause,
                "average_answer_seconds": round(total_seconds / len(answers)) if answers else 0,
            },
            "weak_topics": config.focus_areas[:3] or ["System design"],
            "strengths": ["Used concrete examples", "Explained trade-offs clearly"],
            "recommended_actions": [
                "Practice structuring answers with a clear decision and outcome",
                "Add measurable results to your examples",
            ],
            "answers": [
                {
                    "question": answer.question,
                    "answer": answer.transcript,
                    "score": answer.score if answer.score is not None else 7.0,
                    "ai_comment": (
                        f"Good articulation on {answer.question.split('?')[0]}. Quantify measurable outcomes to strengthen the impact."
                        if (answer.score or 0) >= 7.5
                        else "Addressed core concepts; lead with the decision and trade-off upfront."
                    ),
                    "strengths": answer.strengths or ["Answered with a concrete example"],
                    "missing": answer.missing or ["A measurable outcome or metric"],
                    "better_structure": ["Situation", "Task", "Action", "Result"],
                }
                for answer in answers
            ],
        }

    async def parse_resume(self, text: str) -> dict[str, Any]:
        return {
            "parsed_skills": ["Node.js", "PostgreSQL", "Redis", "Docker", "AWS", "REST APIs"],
            "summary": "Experienced software engineer specializing in backend systems and APIs.",
            "key_highlights": [
                "Built and maintained core backend APIs and databases",
                "Integrated caching to optimize p99 latency",
                "Managed containerized deployment environments",
            ],
            "experience_points": [
                "Designed distributed data models and transaction flows",
                "Implemented resilient microservice integrations",
            ],
            "domain_strengths": ["Backend Architecture", "Databases", "Distributed Systems"],
            "education": ["B.S. in Computer Science"],
            "certifications": ["AWS Certified Solutions Architect"],
            "projects": ["Distributed task queue in Go & Redis"],
        }

    async def generate_completion_insights(
        self, config: PracticeConfig, report: dict[str, Any]
    ) -> dict[str, Any]:
        overall = int(report.get("overall", 0))
        dimensions = {
            "Technical": int(report.get("technical", overall)),
            "Communication": int(report.get("communication", overall)),
            "Answer structure": int(report.get("structure", overall)),
            "Clarity": int(report.get("clarity", overall)),
            "Relevance": int(report.get("relevance", overall)),
            "Depth": int(report.get("depth", overall)),
        }
        weakest = min(dimensions, key=lambda label: dimensions[label])
        weak_topics: list[str] = report.get("weak_topics") or config.focus_areas or [weakest]
        actions: list[str] = report.get("recommended_actions") or []

        return {
            "band": next(label for floor, label in _OVERALL_BANDS if overall >= floor),
            # NOTE: there used to be a `top_percent` here computed as `100 - overall`
            # and rendered as "TOP 3%". There is no cohort to be in the top of, so it
            # was a fabricated standing presented as a measurement. Removed.
            "caption": f"{weakest} is your lowest dimension at {dimensions[weakest]}.",
            # No previous session is in scope here, so no metric moved measurably —
            # the completion view omits deltas rather than inventing them.
            "metric_deltas": {},
            "protocols": [
                {
                    "id": f"protocol-{index + 1}",
                    "priority": _PROTOCOL_PRIORITIES[min(index, len(_PROTOCOL_PRIORITIES) - 1)],
                    "title": weak_topics[index % len(weak_topics)],
                    "detail": action,
                    "focus_area": weak_topics[index % len(weak_topics)],
                }
                for index, action in enumerate(actions[:3])
            ],
        }

    async def answer_report_question(
        self,
        config: PracticeConfig,
        report: dict[str, Any],
        question_context: dict[str, Any] | None,
        history: list[dict[str, str]],
        message: str,
    ) -> str:
        if question_context:
            score = question_context.get("score", report.get("overall", 0))
            missing = question_context.get("missing") or []
            gap = f" to cover {missing[0].lower()}" if missing else ""
            return (
                f"On \"{question_context.get('question', 'that question')}\" you scored "
                f"{score}/10. A stronger answer would lead with the decision, then the "
                f"trade-off, then the outcome{gap}."
            )
        return (
            f"Your overall score was {report.get('overall', 0)}/100. The fastest way to "
            f"raise it is to tighten up {', '.join(report.get('weak_topics', [])[:2]) or 'your weakest topic'} "
            "with a concrete example next time."
        )
