from app.ai.orchestrator import AIOrchestrator
from app.ai.provider.mock import MockAIProvider
from app.config import Settings


async def test_mock_provider_runs_without_openrouter_key() -> None:
    orchestrator = AIOrchestrator(MockAIProvider(), Settings(ai_provider="mock"))
    result = await orchestrator.classify_calendar_event({"title": "Technical interview"})
    assert result.is_interview is True
    assert result.company == "Acme Labs"
