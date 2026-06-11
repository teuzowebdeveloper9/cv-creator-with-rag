from abc import ABC, abstractmethod
from typing import List, Dict, Any

class LLMProvider(ABC):
    @abstractmethod
    def generate(self, prompt: str, system_prompt: str = "") -> str:
        pass

    @abstractmethod
    def is_available(self) -> bool:
        pass

class VectorStore(ABC):
    @abstractmethod
    def upsert(self, collection_name: str, texts: List[str], metadatas: List[Dict[str, Any]]):
        pass

    @abstractmethod
    def search(self, collection_name: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        pass
