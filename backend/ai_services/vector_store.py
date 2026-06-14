import os
import hashlib
import re
from collections import defaultdict
from datetime import datetime, timezone
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer
from .interfaces import VectorStore
from typing import List, Dict, Any

class QdrantVectorStore(VectorStore):
    _STOPWORDS = {
        "a", "o", "os", "as", "um", "uma", "uns", "umas", "de", "da", "do", "das", "dos",
        "e", "ou", "em", "no", "na", "nos", "nas", "por", "para", "com", "sem", "ao",
        "aos", "à", "às", "que", "se", "sua", "seu", "suas", "seus", "dois", "mais",
        "menos", "sobre", "como", "pela", "pelos", "pelas", "the", "and", "for", "with",
        "from", "to", "of", "in", "on", "at", "by", "an", "or", "is", "are", "you", "your",
    }

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
                id=self._build_point_id(collection_name, texts[i], metadatas[i], i),
                vector=embeddings[i].tolist(),
                payload={"text": texts[i], **metadatas[i]}
            ) for i in range(len(texts))
        ]
        
        self.client.upsert(collection_name=collection_name, points=points)

    def search(self, collection_name: str, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        self._ensure_collection(collection_name)
        candidate_limit = max(limit * 4, 12)
        queries = self._build_query_variants(query)
        merged: Dict[str, Dict[str, Any]] = {}

        for query_index, query_variant in enumerate(queries):
            query_vector = self.encoder.encode(query_variant).tolist()
            results = self.client.query_points(
                collection_name=collection_name,
                query=query_vector,
                limit=candidate_limit
            ).points

            query_weight = 1.0 if query_index == 0 else 0.9
            for hit in results:
                payload = dict(hit.payload or {})
                key = self._result_key(payload)
                semantic_score = float(getattr(hit, "score", 0.0) or 0.0)
                recency_score = self._recency_score(payload)
                lexical_score = self._lexical_overlap_score(query_variant, payload.get("text", ""))
                combined_score = (
                    (semantic_score * 0.70)
                    + (lexical_score * 0.20)
                    + (recency_score * 0.10)
                ) * query_weight

                current = merged.get(key)
                if current is None or combined_score > current["_combined_score"]:
                    payload["_score"] = semantic_score
                    payload["_combined_score"] = combined_score
                    payload["_query_variant"] = query_variant
                    merged[key] = payload

        ranked = sorted(
            merged.values(),
            key=lambda item: (
                item.get("_combined_score", 0.0),
                item.get("_score", 0.0),
                item.get("document_created_at", ""),
            ),
            reverse=True,
        )

        selected: List[Dict[str, Any]] = []
        per_source_count: Dict[str, int] = defaultdict(int)
        for item in ranked:
            source_key = self._source_key(item)
            if per_source_count[source_key] >= 2:
                continue
            selected.append(item)
            per_source_count[source_key] += 1
            if len(selected) >= limit:
                break

        if len(selected) < limit:
            for item in ranked:
                if item in selected:
                    continue
                selected.append(item)
                if len(selected) >= limit:
                    break

        return selected[:limit]

    def _build_point_id(self, collection_name: str, text: str, metadata: Dict[str, Any], index: int) -> int:
        material = "|".join([
            collection_name,
            str(metadata.get("document_id", "")),
            str(metadata.get("source", "")),
            str(metadata.get("chunk_index", index)),
            text,
        ])
        digest = hashlib.sha256(material.encode("utf-8")).hexdigest()
        return int(digest[:16], 16)

    def _build_query_variants(self, query: str) -> List[str]:
        normalized = " ".join(query.split())
        variants = [normalized] if normalized else [query]
        keywords = self._extract_keywords(query)
        if keywords:
            variants.append(" ".join(keywords[:12]))
        title_line = self._extract_title_like_fragment(query)
        if title_line and title_line not in variants:
            variants.append(title_line)
        return [variant for variant in variants if variant.strip()]

    def _extract_keywords(self, text: str) -> List[str]:
        tokens = re.findall(r"[A-Za-zÀ-ÿ0-9\-\+.#/]{3,}", text.lower())
        keywords = [token for token in tokens if token not in self._STOPWORDS]
        return list(dict.fromkeys(keywords))

    def _extract_title_like_fragment(self, text: str) -> str:
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        return lines[0] if lines else ""

    def _result_key(self, payload: Dict[str, Any]) -> str:
        return "|".join([
            str(payload.get("document_id", "")),
            str(payload.get("source", "")),
            str(payload.get("chunk_index", "")),
            str(payload.get("text", ""))[:128],
        ])

    def get_collection_stats(self, collection_name: str) -> Dict[str, Any]:
        """Get statistics about the collection metadata quality."""
        info = self.client.get_collection(collection_name)
        total = info.points_count

        sample_size = min(50, total)
        has_chunk_index = 0
        has_document_id = 0
        has_created_at = 0

        if sample_size > 0:
            result, _ = self.client.scroll(
                collection_name=collection_name,
                limit=sample_size,
                with_payload=True,
            )
            for point in result:
                payload = point.payload or {}
                if payload.get("chunk_index") is not None:
                    has_chunk_index += 1
                if payload.get("document_id") is not None and payload.get("document_id") != 0:
                    has_document_id += 1
                if payload.get("document_created_at"):
                    has_created_at += 1

        return {
            "total_points": total,
            "sample_size": sample_size,
            "has_chunk_index": has_chunk_index,
            "has_document_id": has_document_id,
            "has_created_at": has_created_at,
            "metadata_quality": "good" if has_chunk_index == sample_size else "incomplete",
        }

    def _source_key(self, payload: Dict[str, Any]) -> str:
        return str(payload.get("document_id") or payload.get("source") or self._result_key(payload))

    def _lexical_overlap_score(self, query: str, text: str) -> float:
        query_terms = set(self._extract_keywords(query))
        if not query_terms:
            return 0.0
        text_terms = set(self._extract_keywords(text))
        if not text_terms:
            return 0.0
        overlap = len(query_terms & text_terms)
        return min(1.0, overlap / max(len(query_terms), 1))

    def _recency_score(self, payload: Dict[str, Any]) -> float:
        value = payload.get("document_created_at") or payload.get("created_at") or payload.get("updated_at")
        if not value:
            return 0.0

        try:
            parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError:
            return 0.0

        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)

        now = datetime.now(timezone.utc)
        age_days = max((now - parsed.astimezone(timezone.utc)).days, 0)
        return 1.0 / (1.0 + (age_days / 30.0))
