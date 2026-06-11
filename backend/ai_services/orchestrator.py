import logging
from typing import List
from .interfaces import LLMProvider
from .llm_providers import AnthropicProvider, OpenAIProvider, GoogleProvider, MistralProvider

logger = logging.getLogger(__name__)

class LLMOrchestrator:
    def __init__(self):
        self.providers: List[LLMProvider] = [
            AnthropicProvider(),
            OpenAIProvider(),
            GoogleProvider(),
            MistralProvider()
        ]

    def generate(self, prompt: str, system_prompt: str = "") -> str:
        for provider in self.providers:
            if provider.is_available():
                try:
                    logger.info(f"Attempting generation with {provider.__class__.__name__}")
                    return provider.generate(prompt, system_prompt)
                except Exception as e:
                    logger.error(f"Error with {provider.__class__.__name__}: {str(e)}")
                    continue
        
        raise Exception("No LLM providers available or all failed.")

    def stream(self, prompt: str, system_prompt: str = ""):
        for provider in self.providers:
            if provider.is_available():
                try:
                    logger.info(f"Attempting streaming with {provider.__class__.__name__}")
                    yield from provider.stream(prompt, system_prompt)
                    return # Exit if successful
                except Exception as e:
                    logger.error(f"Error streaming with {provider.__class__.__name__}: {str(e)}")
                    continue
        
        raise Exception("No LLM providers available or all failed for streaming.")
