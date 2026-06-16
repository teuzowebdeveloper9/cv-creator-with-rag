from abc import ABC, abstractmethod
from typing import List, Dict, Any

class LLMProvider(ABC):
    @abstractmethod
    def generate(self, prompt: str, system_prompt: str = "") -> str:
        pass

    @abstractmethod
    def stream(self, prompt: str, system_prompt: str = ""):
        pass

    @abstractmethod
    def is_available(self) -> bool:
        pass

class VectorStore(ABC):
    @abstractmethod
    def upsert(
        self,
        collection_name: str,
        texts: List[str],
        metadatas: List[Dict[str, Any]],
        user_id: Any = None,
        tenant_id: Any = None,
    ):
        pass

    @abstractmethod
    def search(
        self,
        collection_name: str,
        query: str,
        limit: int = 5,
        max_per_source: int = 1,
        user_id: Any = None,
        tenant_id: Any = None,
    ) -> List[Dict[str, Any]]:
        pass
