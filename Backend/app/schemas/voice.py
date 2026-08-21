from pydantic import BaseModel, Field


class TTSRequest(BaseModel):
    text: str = Field(
        ..., min_length=1, max_length=4000, description="Text to synthesize to speech"
    )
    voice: str = Field(
        default="en-US-JennyNeural",
        description="Voice ID (e.g. en-US-JennyNeural, en-US-GuyNeural, en-GB-SoniaNeural)",
    )
    rate: str = Field(default="+0%", description="Speech rate adjustment (e.g. +0%, -10%, +15%)")
    pitch: str = Field(default="+0Hz", description="Speech pitch adjustment (e.g. +0Hz, -5Hz)")


class VoicePersona(BaseModel):
    id: str = Field(..., description="Voice identifier for TTS synthesis")
    name: str = Field(..., description="Display name for the voice")
    gender: str = Field(..., description="Gender (female, male, neutral)")
    accent: str = Field(..., description="Accent/Region (US, UK, IN, AU, etc.)")
    style: str = Field(..., description="Interviewer demeanor or persona style")
    sample_text: str = Field(..., description="Sample preview sentence for this voice")
    is_default: bool = Field(default=False, description="Whether this is the default voice persona")


class VoiceListResponse(BaseModel):
    voices: list[VoicePersona]
