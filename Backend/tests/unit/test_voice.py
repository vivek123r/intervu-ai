import pytest
from fastapi.testclient import TestClient

from app.services.voice import VoiceService


def test_voice_personas_list():
    personas = VoiceService.get_personas()
    assert len(personas) >= 5
    default_persona = next((p for p in personas if p.is_default), None)
    assert default_persona is not None
    assert default_persona.name == "Jenny"


def test_api_list_voices(client: TestClient):
    response = client.get("/api/v1/voice/voices")
    assert response.status_code == 200
    data = response.json()
    assert "voices" in data
    assert len(data["voices"]) >= 5
    assert any(v["id"] == "en-US-JennyNeural" for v in data["voices"])


@pytest.mark.asyncio
async def test_voice_service_synthesis():
    service = VoiceService()
    audio = await service.synthesize("Testing voice synthesis.", voice="en-US-JennyNeural")
    assert isinstance(audio, bytes)
    assert len(audio) > 0


def test_api_tts_post(client: TestClient):
    response = client.post(
        "/api/v1/voice/tts",
        json={"text": "Hello, this is a test.", "voice": "en-US-JennyNeural"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/mpeg"
    assert len(response.content) > 0
