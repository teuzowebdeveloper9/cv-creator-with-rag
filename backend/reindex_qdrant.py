#!/usr/bin/env python3
"""
Re-index Qdrant collection with proper metadata.
Run: docker compose exec backend python reindex_qdrant.py
"""

import os
import sys
import hashlib
import logging

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, Filter, FieldCondition, MatchAll
from sentence_transformers import SentenceTransformer
from api.models import Document

try:
    from colorlog import ColoredFormatter
    _handler = logging.StreamHandler()
    _handler.setFormatter(ColoredFormatter(
        '%(log_color)s%(asctime)s %(levelname)-8s%(reset)s %(blue)s[%(name)s]%(reset)s %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
        log_colors={
            'DEBUG': 'cyan', 'INFO': 'green', 'WARNING': 'yellow',
            'ERROR': 'red', 'CRITICAL': 'bold_red',
        },
    ))
except ImportError:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter('%(asctime)s %(levelname)-8s [%(name)s] %(message)s', '%Y-%m-%d %H:%M:%S'))

logging.basicConfig(level=logging.INFO, handlers=[_handler])
logger = logging.getLogger(__name__)

QDRANT_HOST = os.getenv("QDRANT_HOST", "qdrant")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", 6333))
COLLECTION = "user_context"

client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT, check_compatibility=False)
encoder = SentenceTransformer("all-MiniLM-L6-v2")


def build_point_id(text: str, doc_id: int, source: str, chunk_index: int) -> int:
    material = "|".join([str(doc_id), source, str(chunk_index), text[:200]])
    digest = hashlib.sha256(material.encode("utf-8")).hexdigest()
    return int(digest[:16], 16)


def find_document(source: str) -> Document | None:
    doc = Document.objects.filter(name=source).first()
    if doc:
        return doc

    base = os.path.splitext(source)[0]
    doc = Document.objects.filter(name__icontains=base).first()
    return doc


def reindex():
    logger.info("Starting re-indexation of '%s'", COLLECTION)

    all_points = []
    offset = None
    while True:
        result, offset = client.scroll(
            collection_name=COLLECTION,
            limit=200,
            offset=offset,
            with_payload=True,
            with_vectors=True,
        )
        all_points.extend(result)
        if offset is None:
            break

    logger.info("Found %d points", len(all_points))

    new_points = []
    matched = 0
    unmatched = 0

    for point in all_points:
        payload = point.payload or {}
        text = payload.get("text", "")
        source = payload.get("source", "unknown")

        if not text.strip():
            continue

        doc = find_document(source)

        if doc:
            matched += 1
            metadata = {
                "source": doc.name,
                "document_id": doc.id,
                "document_name": doc.name,
                "document_created_at": doc.created_at.isoformat() if doc.created_at else "",
                "document_updated_at": doc.updated_at.isoformat() if doc.updated_at else "",
            }
        else:
            unmatched += 1
            metadata = {
                "source": source,
                "document_id": 0,
                "document_name": source,
                "document_created_at": "",
                "document_updated_at": "",
            }

        metadata["chunk_index"] = 0
        metadata["chunk_total"] = 1

        new_id = build_point_id(text, metadata["document_id"], source, 0)

        new_points.append(
            PointStruct(
                id=new_id,
                vector=point.vector,
                payload={"text": text, **metadata},
            )
        )

    logger.info("Matched: %d, Unmatched: %d", matched, unmatched)

    # Delete all points
    logger.info("Deleting old points...")
    client.delete(
        collection_name=COLLECTION,
        points_selector=Filter(must=[FieldCondition(key="text", match=MatchAll())]),
    )

    # Insert in batches
    logger.info("Inserting %d points...", len(new_points))
    batch_size = 100
    for i in range(0, len(new_points), batch_size):
        batch = new_points[i:i + batch_size]
        client.upsert(collection_name=COLLECTION, points=batch)
        logger.info("  Batch %d/%d done", i // batch_size + 1, (len(new_points) + batch_size - 1) // batch_size)

    info = client.get_collection(COLLECTION)
    logger.info("Done. Points: %d", info.points_count)

    return {"total": len(all_points), "matched": matched, "unmatched": unmatched, "final": info.points_count}


if __name__ == "__main__":
    try:
        result = reindex()
        print(f"\nResult: {result['matched']} matched, {result['unmatched']} unmatched, {result['final']} total")
    except Exception as e:
        logger.error("Failed: %s", e, exc_info=True)
        sys.exit(1)
