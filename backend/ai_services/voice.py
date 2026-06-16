import os
import logging
from elevenlabs import ElevenLabs

logger = logging.getLogger(__name__)


class ElevenLabsService:
    def __init__(self):
        self.api_key = os.getenv("ELEVENLABS_API_KEY", "")
        self.client = None
        if self.api_key and "your_" not in self.api_key:
            try:
                self.client = ElevenLabs(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Failed to initialize ElevenLabs: {e}")

    def is_available(self) -> bool:
        return self.client is not None

    def text_to_speech(self, text: str, voice_id: str = "21m00Tcm4TlvDq8ikWAM") -> bytes | None:
        if not self.is_available():
            logger.warning("ElevenLabs not available for TTS")
            return None

        try:
            audio = self.client.text_to_speech.convert(
                voice_id=voice_id,
                text=text,
                model_id="eleven_multilingual_v2",
                output_format="mp3_44100_128",
            )
            return audio
        except Exception as e:
            logger.error(f"TTS failed: {e}")
            return None

    def speech_to_text(self, audio_data: bytes) -> str | None:
        if not self.is_available():
            logger.warning("ElevenLabs not available for STT")
            return None

        try:
            text = self.client.speech_to_text.convert(
                file=audio_data,
                model_id="scribe_v1",
            )
            return text.text if text else None
        except Exception as e:
            logger.error(f"STT failed: {e}")
            return None

    def list_voices(self) -> list[dict]:
        if not self.is_available():
            return []

        try:
            voices = self.client.voices.get_all()
            return [
                {"id": v.voice_id, "name": v.name, "labels": v.labels}
                for v in voices.voices
            ]
        except Exception as e:
            logger.error(f"Failed to list voices: {e}")
            return []


elevenlabs_service = ElevenLabsService()
