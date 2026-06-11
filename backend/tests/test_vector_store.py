import pytest
from ai_services.vector_store import QdrantVectorStore
from qdrant_client import QdrantClient
import os

@pytest.fixture
def mock_qdrant(mocker):
    # Use in-memory Qdrant client for testing
    client = QdrantClient(":memory:")
    # Patch QdrantClient inside QdrantVectorStore to return our in-memory client
    mocker.patch("ai_services.vector_store.QdrantClient", return_value=client)
    return client

def test_qdrant_upsert_and_search(mock_qdrant):
    store = QdrantVectorStore()
    
    collection = "test_collection"
    texts = ["O rato roeu a roupa do rei de Roma", "O peito do pé de Pedro é preto"]
    metadatas = [{"source": "test1"}, {"source": "test2"}]
    
    store.upsert(collection, texts, metadatas)
    
    # Check if collection was created
    assert mock_qdrant.collection_exists(collection)
    
    # Search for something related to the first text
    results = store.search(collection, query="Quem roeu a roupa?", limit=1)
    
    assert len(results) == 1
    assert "rato" in results[0]["text"]
    assert results[0]["source"] == "test1"

def test_qdrant_no_pollution(mock_qdrant):
    # This test ensures that another instance with mock still sees nothing initially
    store = QdrantVectorStore()
    assert len(mock_qdrant.get_collections().collections) == 0
