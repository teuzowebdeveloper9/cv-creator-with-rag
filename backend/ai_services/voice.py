import base64
import logging
import os
from elevenlabs import ElevenLabs

logger = logging.getLogger(__name__)

DEFAULT_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
DEFAULT_TTS_MODEL = os.getenv("ELEVENLABS_TTS_MODEL", "eleven_multilingual_v2")
DEFAULT_OUTPUT_FORMAT = os.getenv("ELEVENLABS_OUTPUT_FORMAT", "mp3_44100_128")
DEFAULT_AUDIO_MIME_TYPE = "audio/mpeg"


class ElevenLabsService:
    def __init__(self):
        self.api_key = os.getenv("ELEVENLABS_API_KEY", "")
        self.default_voice_id = DEFAULT_VOICE_ID
        self.client = None
        if self.api_key and "your_" not in self.api_key:
            try:
                self.client = ElevenLabs(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Failed to initialize ElevenLabs: {e}")

    def is_available(self) -> bool:
        return self.client is not None

    def text_to_speech(self, text: str, voice_id: str | None = None) -> bytes | None:
        if not self.is_available():
            logger.warning("ElevenLabs not available for TTS")
            return None

        try:
            chosen_voice_id = voice_id or self.default_voice_id
            logger.info("TTS request: voice=%s, text=%d chars", chosen_voice_id, len(text))
            audio_generator = self.client.text_to_speech.convert(
                voice_id=chosen_voice_id,
                text=text,
                model_id=DEFAULT_TTS_MODEL,
                output_format=DEFAULT_OUTPUT_FORMAT,
            )
            audio_bytes = b"".join(audio_generator)
            logger.info("TTS completed: %d bytes", len(audio_bytes))
            return audio_bytes
        except Exception as e:
            logger.error(f"TTS failed: {e}")
            return None

    def build_audio_data_url(self, audio_bytes: bytes, mime_type: str = DEFAULT_AUDIO_MIME_TYPE) -> str:
        return f"data:{mime_type};base64,{base64.b64encode(audio_bytes).decode('ascii')}"

    def build_tts_payload(
        self,
        text: str,
        voice_id: str | None = None,
        *,
        audio_url: str = "",
        include_data_url: bool = False,
    ) -> dict:
        normalized_text = (text or "").strip()
        payload = {
            "provider": "elevenlabs",
            "voice_id": voice_id or self.default_voice_id,
            "mime_type": DEFAULT_AUDIO_MIME_TYPE,
            "format": "mp3",
            "text": normalized_text,
            "audio_url": audio_url,
            "audio_data_url": "",
            "available": self.is_available(),
            "status": "unavailable",
        }
        if not normalized_text:
            payload["status"] = "empty"
            return payload
        if not self.is_available():
            return payload

        audio_bytes = self.text_to_speech(normalized_text, voice_id=voice_id)
        if not audio_bytes:
            payload["status"] = "failed"
            return payload

        payload["status"] = "ready"
        if include_data_url:
            payload["audio_data_url"] = self.build_audio_data_url(audio_bytes)
        return payload

    def speech_to_text(self, audio_data: bytes) -> str | None:
        if not self.is_available():
            logger.warning("ElevenLabs not available for STT")
            return None

        try:
            import io
            audio_file = io.BytesIO(audio_data)
            audio_file.name = "audio.webm"
            logger.info("STT request: %d bytes", len(audio_data))
            text = self.client.speech_to_text.convert(
                file=audio_file,
                model_id="scribe_v1",
            )
            result = text.text if text else None
            logger.info("STT completed: %d chars", len(result) if result else 0)
            return result
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
