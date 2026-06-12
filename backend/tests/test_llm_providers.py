from ai_services import llm_providers
from ai_services.llm_providers import GoogleProvider


class _Response:
    text = "ok"


class _Chunk:
    text = "ok"


class _Models:
    def __init__(self):
        self.generate_calls = []
        self.stream_calls = []

    def generate_content(self, model, contents):
        self.generate_calls.append(model)
        if model == "busy-model":
            raise RuntimeError("busy")
        return _Response()

    def generate_content_stream(self, model, contents):
        self.stream_calls.append(model)
        if model == "busy-model":
            raise RuntimeError("busy")
        return iter([_Chunk()])


class _Client:
    def __init__(self):
        self.models = _Models()


def test_google_provider_uses_configured_model_then_fallback(monkeypatch):
    client = _Client()
    monkeypatch.setenv("GOOGLE_API_KEY", "real_google_key")
    monkeypatch.setenv("GEMINI_MODEL", "busy-model")
    monkeypatch.setattr(llm_providers.genai, "Client", lambda api_key: client)

    provider = GoogleProvider()

    assert provider.generate("ping") == "ok"
    assert client.models.generate_calls == ["busy-model", "gemini-2.5-flash"]


def test_google_provider_stream_uses_configured_model_then_fallback(monkeypatch):
    client = _Client()
    monkeypatch.setenv("GOOGLE_API_KEY", "real_google_key")
    monkeypatch.setenv("GEMINI_MODEL", "busy-model")
    monkeypatch.setattr(llm_providers.genai, "Client", lambda api_key: client)

    provider = GoogleProvider()

    assert "".join(provider.stream("ping")) == "ok"
    assert client.models.stream_calls == ["busy-model", "gemini-2.5-flash"]
