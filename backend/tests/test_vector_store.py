import pytest
from ai_services.vector_store import QdrantVectorStore
from qdrant_client import QdrantClient
import os
import numpy as np
from datetime import datetime, timezone, timedelta


class _FakeEncoder:
    def encode(self, texts):
        if isinstance(texts, str):
            texts = [texts]

        vectors = []
        for text in texts:
            folded = text.lower()
            vector = np.zeros(384, dtype=float)

            if "rato" in folded or "roupa" in folded or "roma" in folded:
                vector[0] = 1.0
            if "pedro" in folded or "peito" in folded:
                vector[1] = 1.0
            if "python" in folded or "fastapi" in folded:
                vector[2] = 1.0
            if "java" in folded or "spring" in folded:
                vector[3] = 1.0

            vectors.append(vector)

        return np.array(vectors) if len(vectors) > 1 else vectors[0]

@pytest.fixture
def mock_qdrant(mocker):
    # Use in-memory Qdrant client for testing
    client = QdrantClient(":memory:")
    # Patch QdrantClient inside QdrantVectorStore to return our in-memory client
    mocker.patch("ai_services.vector_store.QdrantClient", return_value=client)
    mocker.patch("ai_services.vector_store.SentenceTransformer", return_value=_FakeEncoder())
    return client

def test_qdrant_upsert_and_search(mock_qdrant):
    store = QdrantVectorStore()
    
    collection = "test_collection"
    texts = ["O rato roeu a roupa do rei de Roma", "O peito do pé de Pedro é preto"]
    now = datetime.now(timezone.utc)
    metadatas = [
        {
            "source": "test1",
            "document_id": 1,
            "document_name": "test1",
            "document_created_at": now.isoformat(),
            "chunk_index": 0,
        },
        {
            "source": "test2",
            "document_id": 2,
            "document_name": "test2",
            "document_created_at": (now - timedelta(days=120)).isoformat(),
            "chunk_index": 0,
        },
    ]
    
    store.upsert(collection, texts, metadatas)
    
    # Check if collection was created
    assert mock_qdrant.collection_exists(collection)
    
    # Search for something related to the first text
    results = store.search(collection, query="Quem roeu a roupa?", limit=1)
    
    assert len(results) == 1
    assert "rato" in results[0]["text"]
    assert results[0]["source"] == "test1"
    assert results[0]["document_id"] == 1
    assert "_score" in results[0]

def test_qdrant_no_pollution(mock_qdrant):
    # This test ensures that another instance with mock still sees nothing initially
    store = QdrantVectorStore()
    assert len(mock_qdrant.get_collections().collections) == 0
