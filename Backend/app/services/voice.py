import hashlib
import logging
from collections import OrderedDict
from typing import ClassVar

import edge_tts

from app.schemas.voice import VoicePersona

logger = logging.getLogger(__name__)


class VoiceService:
    """Service for studio-grade neural text-to-speech synthesis."""

    # In-memory LRU cache to instantly return audio for repeated/preloaded questions
    _cache: ClassVar[OrderedDict[str, bytes]] = OrderedDict()
    _CACHE_MAX_SIZE: ClassVar[int] = 120

    AVAILABLE_PERSONAS: ClassVar[list[VoicePersona]] = [
        VoicePersona(
            id="en-US-JennyNeural",
            name="Jenny",
            gender="female",
            accent="US English",
            style="Warm & Professional",
            sample_text="Hello, I'm Jenny. Let's begin our technical interview session today.",
            is_default=True,
        ),
        VoicePersona(
            id="en-US-GuyNeural",
            name="Guy",
            gender="male",
            accent="US English",
            style="Calm & Technical Lead",
            sample_text="Hi there, I'm Guy. I'll walk through your systems architecture questions.",
            is_default=False,
        ),
        VoicePersona(
            id="en-US-AriaNeural",
            name="Aria",
            gender="female",
            accent="US English",
            style="Articulate & Executive",
            sample_text="Welcome. I'm Aria, and we will focus on problem-solving and trade-offs.",
            is_default=False,
        ),
        VoicePersona(
            id="en-US-ChristopherNeural",
            name="Christopher",
            gender="male",
            accent="US English",
            style="Senior Staff & Authoritative",
            sample_text="Hello, I'm Christopher. Let's dive into your engineering experience.",
            is_default=False,
        ),
        VoicePersona(
            id="en-US-EricNeural",
            name="Eric",
            gender="male",
            accent="US English",
            style="Conversational & Modern",
            sample_text="Hey! I'm Eric. We'll explore problem solving and algorithmic reasoning.",
            is_default=False,
        ),
        VoicePersona(
            id="en-GB-SoniaNeural",
            name="Sonia",
            gender="female",
            accent="British English",
            style="Crisp & Composed",
            sample_text="Good day. I am Sonia, and I will be guiding our technical evaluation.",
            is_default=False,
        ),
        VoicePersona(
            id="en-GB-RyanNeural",
            name="Ryan",
            gender="male",
            accent="British English",
            style="Methodical & Clear",
            sample_text="Hello, I'm Ryan. Let's review how you structure scalable systems.",
            is_default=False,
        ),
        VoicePersona(
            id="en-IN-NeerjaNeural",
            name="Neerja",
            gender="female",
            accent="Indian English",
            style="Polished & Encouraging",
            sample_text="Namaste and welcome. I am Neerja, and I look forward to our discussion.",
            is_default=False,
        ),
        VoicePersona(
            id="en-IN-PrabhatNeural",
            name="Prabhat",
            gender="male",
            accent="Indian English",
            style="Sharp & Professional",
            sample_text="Hello, I am Prabhat. Let's discuss your technical approach.",
            is_default=False,
        ),
    ]

    @classmethod
    def get_personas(cls) -> list[VoicePersona]:
        return cls.AVAILABLE_PERSONAS

    @classmethod
    def _cache_key(cls, text: str, voice: str, rate: str, pitch: str) -> str:
        raw = f"{voice}:{rate}:{pitch}:{text.strip()}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    async def synthesize(
        self,
        text: str,
        voice: str = "en-US-JennyNeural",
        rate: str = "+0%",
        pitch: str = "+0Hz",
    ) -> bytes:
        """Synthesize text to neural audio (MP3 bytes)."""
        clean_text = text.strip()
        if not clean_text:
            raise ValueError("Text cannot be empty for speech synthesis.")

        # Check in-memory cache
        key = self._cache_key(clean_text, voice, rate, pitch)
        if key in self._cache:
            # Move to end (MRU)
            self._cache.move_to_end(key)
            return self._cache[key]

        # Validate voice against allowed list or fallback to default
        valid_voice_ids = {p.id for p in self.AVAILABLE_PERSONAS}
        selected_voice = voice if voice in valid_voice_ids else "en-US-JennyNeural"

        try:
            communicate = edge_tts.Communicate(
                text=clean_text,
                voice=selected_voice,
                rate=rate,
                pitch=pitch,
            )

            chunks: list[bytes] = []
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    chunks.append(chunk["data"])

            audio_bytes = b"".join(chunks)
            if not audio_bytes:
                raise RuntimeError("Edge TTS produced empty audio stream.")

            # Store in LRU cache
            self._cache[key] = audio_bytes
            if len(self._cache) > self._CACHE_MAX_SIZE:
                self._cache.popitem(last=False)  # evict oldest

            return audio_bytes
        except Exception as e:
            logger.error("Failed to synthesize audio with edge-tts: %s", e)
            raise
