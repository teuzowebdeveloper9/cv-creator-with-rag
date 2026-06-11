import os
from .interfaces import LLMProvider
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_mistralai import ChatMistralAI
from langchain_core.messages import HumanMessage, SystemMessage

class AnthropicProvider(LLMProvider):
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        if self.api_key:
            self.model = ChatAnthropic(model="claude-3-5-sonnet-20240620", anthropic_api_key=self.api_key)

    def generate(self, prompt: str, system_prompt: str = "") -> str:
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=prompt)
        ]
        response = self.model.invoke(messages)
        return response.content

    def stream(self, prompt: str, system_prompt: str = ""):
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=prompt)
        ]
        for chunk in self.model.stream(messages):
            yield chunk.content

    def is_available(self) -> bool:
        return bool(self.api_key) and "your_" not in self.api_key and self.api_key != ""

class OpenAIProvider(LLMProvider):
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if self.api_key:
            self.model = ChatOpenAI(model="gpt-4o", openai_api_key=self.api_key)

    def generate(self, prompt: str, system_prompt: str = "") -> str:
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=prompt)
        ]
        response = self.model.invoke(messages)
        return response.content

    def stream(self, prompt: str, system_prompt: str = ""):
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=prompt)
        ]
        for chunk in self.model.stream(messages):
            yield chunk.content

    def is_available(self) -> bool:
        return bool(self.api_key) and "your_" not in self.api_key and self.api_key != ""

class GoogleProvider(LLMProvider):
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")
        if self.api_key:
            self.model = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=self.api_key)

    def generate(self, prompt: str, system_prompt: str = "") -> str:
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=prompt)
        ]
        response = self.model.invoke(messages)
        return response.content

    def stream(self, prompt: str, system_prompt: str = ""):
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=prompt)
        ]
        for chunk in self.model.stream(messages):
            yield chunk.content

    def is_available(self) -> bool:
        return bool(self.api_key) and "your_" not in self.api_key and self.api_key != ""

class MistralProvider(LLMProvider):
    def __init__(self):
        self.api_key = os.getenv("MISTRAL_API_KEY")
        if self.api_key:
            self.model = ChatMistralAI(model="mistral-large-latest", mistral_api_key=self.api_key)

    def generate(self, prompt: str, system_prompt: str = "") -> str:
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=prompt)
        ]
        response = self.model.invoke(messages)
        return response.content

    def stream(self, prompt: str, system_prompt: str = ""):
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=prompt)
        ]
        for chunk in self.model.stream(messages):
            yield chunk.content

    def is_available(self) -> bool:
        return bool(self.api_key) and "your_" not in self.api_key and self.api_key != ""
