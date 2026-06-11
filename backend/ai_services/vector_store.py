import os
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer
from .interfaces import VectorStore
from typing import List, Dict, Any

class QdrantVectorStore(VectorStore):
    def __init__(self):
        self.host = os.getenv("QDRANT_HOST", "qdrant")
        self.port = int(os.getenv("QDRANT_PORT", 6333))
        self.client = QdrantClient(host=self.host, port=self.port)
        self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
        self.vector_size = 384 # Size for all-MiniLM-L6-v2

    def _ensure_collection(self, collection_name: str):
        collections = self.client.get_collections().collections
        exists = any(c.name == collection_name for c in collections)
        if not exists:
            self.client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=self.vector_size, distance=Distance.COSINE),
            )

    def upsert(self, collection_name: str, texts: List[str], metadatas: List[Dict[str, Any]]):
        self._ensure_collection(collection_name)
        embeddings = self.encoder.encode(texts)
        
        points = [
            PointStruct(
                id=i + hash(texts[i]) % 10**10, # Simple deterministic ID
                vector=embeddings[i].tolist(),
                payload={"text": texts[i], **metadatas[i]}
            ) for i in range(len(texts))
        ]
        
        self.client.upsert(collection_name=collection_name, points=points)

    def search(self, collection_name: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        self._ensure_collection(collection_name)
        query_vector = self.encoder.encode(query).tolist()
        
        results = self.client.search(
            collection_name=collection_name,
            query_vector=query_vector,
            limit=limit
        )
        
        return [hit.payload for hit in results]
