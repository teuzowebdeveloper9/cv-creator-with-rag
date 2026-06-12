import os
import logging
from .interfaces import LLMProvider
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_mistralai import ChatMistralAI
from langchain_core.messages import HumanMessage, SystemMessage
from google import genai

logger = logging.getLogger(__name__)

class AnthropicProvider(LLMProvider):
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        if self.api_key:
            self.model = ChatAnthropic(model="claude-3-5-sonnet-20240620", anthropic_api_key=self.api_key)

    def generate(self, prompt: str, system_prompt: str = "") -> str:
        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=prompt)
            ]
            response = self.model.invoke(messages)
            return response.content
        except Exception as e:
            logger.error(f"Anthropic generate failed: {str(e)}")
            raise e

    def stream(self, prompt: str, system_prompt: str = ""):
        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=prompt)
            ]
            for chunk in self.model.stream(messages):
                yield chunk.content
        except Exception as e:
            logger.error(f"Anthropic stream failed: {str(e)}")
            raise e

    def is_available(self) -> bool:
        return bool(self.api_key) and "your_" not in self.api_key and self.api_key != ""

class OpenAIProvider(LLMProvider):
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if self.api_key:
            self.model = ChatOpenAI(model="gpt-4o", openai_api_key=self.api_key)

    def generate(self, prompt: str, system_prompt: str = "") -> str:
        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=prompt)
            ]
            response = self.model.invoke(messages)
            return response.content
        except Exception as e:
            logger.error(f"OpenAI generate failed: {str(e)}")
            raise e

    def stream(self, prompt: str, system_prompt: str = ""):
        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=prompt)
            ]
            for chunk in self.model.stream(messages):
                yield chunk.content
        except Exception as e:
            logger.error(f"OpenAI stream failed: {str(e)}")
            raise e

    def is_available(self) -> bool:
        return bool(self.api_key) and "your_" not in self.api_key and self.api_key != ""

class GoogleProvider(LLMProvider):
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        configured_model = os.getenv("GEMINI_MODEL") or os.getenv("GOOGLE_GEMINI_MODEL")
        self.model_names = self._model_fallbacks(configured_model)
        self.model_name = self.model_names[0]
        if self.is_available():
            self.client = genai.Client(api_key=self.api_key)

    def generate(self, prompt: str, system_prompt: str = "") -> str:
        full_prompt = self._full_prompt(prompt, system_prompt)
        last_error = None
        for model_name in self.model_names:
            try:
                response = self.client.models.generate_content(
                    model=model_name,
                    contents=full_prompt
                )
                return response.text
            except Exception as e:
                last_error = e
                logger.error(f"Google SDK generate failed with {model_name}: {str(e)}")

        raise last_error or Exception("No Gemini model available.")

    def stream(self, prompt: str, system_prompt: str = ""):
        full_prompt = self._full_prompt(prompt, system_prompt)
        last_error = None
        for model_name in self.model_names:
            try:
                response = self.client.models.generate_content_stream(
                    model=model_name,
                    contents=full_prompt
                )
                yielded = False
                for chunk in response:
                    if chunk.text:
                        yielded = True
                        yield chunk.text
                if yielded:
                    return
            except Exception as e:
                last_error = e
                logger.error(f"Google SDK stream failed with {model_name}: {str(e)}")

        raise last_error or Exception("No Gemini model available.")

    def is_available(self) -> bool:
        return bool(self.api_key) and "your_" not in self.api_key and self.api_key != ""

    @staticmethod
    def _full_prompt(prompt: str, system_prompt: str = "") -> str:
        return f"{system_prompt}\n\n{prompt}" if system_prompt else prompt

    @staticmethod
    def _model_fallbacks(configured_model: str | None) -> list[str]:
        candidates = [
            configured_model,
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite",
        ]
        return [model for index, model in enumerate(candidates) if model and model not in candidates[:index]]

class MistralProvider(LLMProvider):
    def __init__(self):
        self.api_key = os.getenv("MISTRAL_API_KEY")
        if self.api_key:
            self.model = ChatMistralAI(model="mistral-large-latest", mistral_api_key=self.api_key)

    def generate(self, prompt: str, system_prompt: str = "") -> str:
        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=prompt)
            ]
            response = self.model.invoke(messages)
            return response.content
        except Exception as e:
            logger.error(f"Mistral generate failed: {str(e)}")
            raise e

    def stream(self, prompt: str, system_prompt: str = ""):
        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=prompt)
            ]
            for chunk in self.model.stream(messages):
                yield chunk.content
        except Exception as e:
            logger.error(f"Mistral stream failed: {str(e)}")
            raise e

    def is_available(self) -> bool:
        return bool(self.api_key) and "your_" not in self.api_key and self.api_key != ""
