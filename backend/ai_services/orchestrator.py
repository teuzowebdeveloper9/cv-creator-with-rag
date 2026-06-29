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
        available = [p.__class__.__name__ for p in self.providers if p.is_available()]
        logger.info("LLM Orchestrator initialized: %d providers, available=%s", len(self.providers), available)

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
                # 1. Try Streaming
                try:
                    logger.info(f"Attempting streaming with {provider.__class__.__name__}")
                    yield from provider.stream(prompt, system_prompt)
                    return 
                except Exception as e:
                    logger.error(f"Streaming failed with {provider.__class__.__name__}, falling back to static generation: {str(e)}")
                    
                    # 2. Try Static Generation as Fallback
                    try:
                        logger.info(f"Attempting static generation fallback with {provider.__class__.__name__}")
                        full_text = provider.generate(prompt, system_prompt)
                        yield full_text
                        return
                    except Exception as e2:
                        logger.error(f"Static fallback also failed for {provider.__class__.__name__}: {str(e2)}")
                        continue
        
        raise Exception("No LLM providers available or all failed.")
