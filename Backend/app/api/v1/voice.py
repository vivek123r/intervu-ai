from fastapi import APIRouter, HTTPException, Query, Response

from app.dependencies import VoiceServiceDep
from app.schemas.voice import TTSRequest, VoiceListResponse

router = APIRouter(tags=["voice"])


@router.get("/voices", response_model=VoiceListResponse)
async def list_voices(voice_service: VoiceServiceDep) -> VoiceListResponse:
    """List all available high-fidelity neural voice personas."""
    return VoiceListResponse(voices=voice_service.get_personas())


@router.post("/tts")
async def synthesize_speech_post(
    body: TTSRequest,
    voice_service: VoiceServiceDep,
) -> Response:
    """Synthesize text to high-fidelity studio-grade MP3 audio (POST)."""
    try:
        audio_bytes = await voice_service.synthesize(
            text=body.text,
            voice=body.voice,
            rate=body.rate,
            pitch=body.pitch,
        )
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Cache-Control": "public, max-age=86400",
                "Content-Disposition": "inline; filename=speech.mp3",
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Speech synthesis error: {e}") from e


@router.get("/tts")
async def synthesize_speech_get(
    text: str = Query(..., min_length=1, max_length=4000, description="Text to synthesize"),
    voice: str = Query("en-US-JennyNeural", description="Neural voice identifier"),
    rate: str = Query("+0%", description="Rate adjustment e.g. +0%"),
    pitch: str = Query("+0Hz", description="Pitch adjustment e.g. +0Hz"),
    voice_service: VoiceServiceDep = None,  # type: ignore[assignment]
) -> Response:
    """Synthesize text to high-fidelity studio-grade MP3 audio (GET)."""
    try:
        audio_bytes = await voice_service.synthesize(
            text=text,
            voice=voice,
            rate=rate,
            pitch=pitch,
        )
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Cache-Control": "public, max-age=86400",
                "Content-Disposition": "inline; filename=speech.mp3",
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Speech synthesis error: {e}") from e
