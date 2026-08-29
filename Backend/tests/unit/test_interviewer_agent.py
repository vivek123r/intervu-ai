import pytest

from app.ai.mock import DeterministicProvider
from app.ai.openrouter import OpenRouterAIProvider
from app.schemas.common import Difficulty, InterviewType
from app.schemas.interviewer import (
    AnswerAnalysisContext,
    TurnContext,
    TurnRouting,
)
from app.schemas.practice import PracticeConfig
from app.schemas.preparation import Question


@pytest.fixture
def sample_config() -> PracticeConfig:
    return PracticeConfig(
        role="Senior Backend Engineer",
        company="Northstar Labs",
        type=InterviewType.TECHNICAL,
        difficulty=Difficulty.HARD,
        duration=18,
        focus_areas=["Databases", "Distributed Systems"],
        interviewer_style="Senior Engineer",
    )


@pytest.fixture
def sample_question() -> Question:
    return Question(
        id="q-test-1",
        text="How do you handle distributed transactions across microservices?",
        category="System design",
        topic="Distributed systems",
        difficulty=Difficulty.HARD,
    )


@pytest.mark.asyncio
async def test_deterministic_provider_turn_proposes_follow_up_on_short_answer(
    sample_config: PracticeConfig, sample_question: Question
) -> None:
    provider = DeterministicProvider()
    ctx = TurnContext(
        config=sample_config,
        question=sample_question,
        transcript="I use saga pattern.",
        log=[],
        answers_so_far=[],
        follow_ups_used_on_root=0,
        follow_up_budget=3,
        roots_remaining=3,
        planned_root_count=3,
        roots_asked=1,
        topics_covered=["Distributed systems"],
        recent_scores=[],
    )

    routing = await provider.next_turn(ctx)
    assert routing.action == "follow_up"
    assert routing.follow_up is not None
    assert (
        "Distributed systems" in routing.follow_up.text
        or routing.follow_up.topic == "Distributed systems"
    )
    assert len(routing.transition) > 0
    assert routing.next_root is not None

    analysis = await provider.analyze_answer(
        AnswerAnalysisContext(
            config=sample_config, question=sample_question, transcript="I use saga pattern."
        )
    )
    assert analysis.score < 6.0


@pytest.mark.asyncio
async def test_deterministic_provider_turn_advances_on_detailed_answer(
    sample_config: PracticeConfig, sample_question: Question
) -> None:
    provider = DeterministicProvider()
    transcript = (
        "We used an orchestration-based saga with Temporal where each step is idempotent "
        "and compensation handlers undo partial state changes on failure."
    )
    ctx = TurnContext(
        config=sample_config,
        question=sample_question,
        transcript=transcript,
        log=[],
        answers_so_far=[],
        follow_ups_used_on_root=0,
        follow_up_budget=3,
        roots_remaining=3,
        planned_root_count=3,
        roots_asked=1,
        topics_covered=["Distributed systems"],
        recent_scores=[8.5],
    )

    routing = await provider.next_turn(ctx)
    assert routing.action == "advance"
    assert routing.follow_up is None
    assert len(routing.transition) > 0
    assert routing.next_root is not None

    analysis = await provider.analyze_answer(
        AnswerAnalysisContext(config=sample_config, question=sample_question, transcript=transcript)
    )
    assert analysis.score >= 6.0


@pytest.mark.asyncio
async def test_deterministic_provider_enforces_budget_limit(
    sample_config: PracticeConfig, sample_question: Question
) -> None:
    provider = DeterministicProvider()
    ctx = TurnContext(
        config=sample_config,
        question=sample_question,
        transcript="Short answer.",
        log=[],
        answers_so_far=[],
        follow_ups_used_on_root=2,  # Root limit reached
        follow_up_budget=0,  # Budget exhausted
        roots_remaining=2,
        planned_root_count=3,
        roots_asked=2,
        topics_covered=["Distributed systems"],
        recent_scores=[4.0],
    )

    routing = await provider.next_turn(ctx)
    assert routing.action == "advance"
    assert routing.follow_up is None
    assert routing.next_root is not None


@pytest.mark.asyncio
async def test_deterministic_provider_generate_first_and_fallback_next(
    sample_config: PracticeConfig,
) -> None:
    provider = DeterministicProvider()
    first_q = await provider.generate_first_question(sample_config)
    assert first_q.id.startswith("q-")
    assert first_q.difficulty == sample_config.difficulty

    # Fallback next root with low score steps down difficulty
    next_q = await provider.fallback_next_root(
        sample_config,
        topics_covered=[first_q.topic],
        recent_scores=[3.0],
    )
    assert next_q.id.startswith("q-")
    assert next_q.topic is not None
    assert next_q.difficulty == Difficulty.NORMAL  # stepped down from HARD on mean <= 5.0


@pytest.mark.asyncio
async def test_openrouter_provider_fallback_when_no_api_key(
    sample_config: PracticeConfig, sample_question: Question
) -> None:
    provider = OpenRouterAIProvider(api_key="")
    ctx = TurnContext(
        config=sample_config,
        question=sample_question,
        transcript="Short answer.",
        log=[],
        answers_so_far=[],
        follow_ups_used_on_root=0,
        follow_up_budget=3,
        roots_remaining=3,
        planned_root_count=3,
        roots_asked=1,
        topics_covered=["Distributed systems"],
        recent_scores=[],
    )

    routing = await provider.next_turn(ctx)
    assert isinstance(routing, TurnRouting)
    assert routing.transition is not None
    assert routing.next_root is not None

    analysis = await provider.analyze_answer(
        AnswerAnalysisContext(
            config=sample_config, question=sample_question, transcript="Short answer."
        )
    )
    assert analysis.score > 0

    first_q = await provider.generate_first_question(sample_config)
    assert first_q.id.startswith("q-")


@pytest.mark.parametrize(
    "interview_type,expected_category",
    [
        (InterviewType.TECHNICAL, "Technical"),
        (InterviewType.SYSTEM_DESIGN, "System design"),
        (InterviewType.BEHAVIORAL, "Behavioral"),
        (InterviewType.HIRING_MANAGER, "Hiring manager"),
        (InterviewType.RECRUITER, "Recruiter screen"),
    ],
)
@pytest.mark.asyncio
async def test_deterministic_provider_respects_interview_type(
    sample_config: PracticeConfig,
    interview_type: InterviewType,
    expected_category: str,
) -> None:
    """A "behavioral" session must never surface a "system design" question just
    because the deterministic fallback provider is active (e.g. no API key set)."""
    provider = DeterministicProvider()
    config = sample_config.model_copy(update={"type": interview_type, "focus_areas": []})

    first_q = await provider.generate_first_question(config)
    assert first_q.category == expected_category

    questions = await provider.generate_questions(config, count=4)
    assert all(q.category == expected_category for q in questions)

    next_root = await provider.fallback_next_root(
        config, topics_covered=[first_q.topic], recent_scores=[7.0]
    )
    assert next_root.category == expected_category
