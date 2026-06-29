#!/usr/bin/env python3
"""
Re-index all documents from a source directory into Qdrant with proper metadata.
Run: docker compose exec backend python reindex_from_files.py /path/to/files
"""

import os
import sys
import hashlib
import logging

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct
from sentence_transformers import SentenceTransformer
from ai_services.document_processor import DocumentProcessor
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
processor = DocumentProcessor()


def build_point_id(text: str, doc_id: int, source: str, chunk_index: int) -> int:
    material = "|".join([str(doc_id), source, str(chunk_index), text[:200]])
    digest = hashlib.sha256(material.encode("utf-8")).hexdigest()
    return int(digest[:16], 16)


def index_file(filepath: str) -> dict:
    filename = os.path.basename(filepath)
    ext = os.path.splitext(filename)[1].lower()

    with open(filepath, "rb") as f:
        content = f.read()

    if ext == ".pdf":
        text = processor.extract_from_pdf(content)
    elif ext in (".html", ".htm"):
        text = processor.extract_from_html(content)
    else:
        return {"file": filename, "status": "skipped", "reason": "unsupported format"}

    if not text.strip():
        return {"file": filename, "status": "skipped", "reason": "no text extracted"}

    doc, created = Document.objects.get_or_create(
        name=filename,
        defaults={"status": "SUCCESS"}
    )
    if not created:
        doc.status = "SUCCESS"
        doc.save()

    chunks = processor.split_text(text)
    now_str = doc.created_at.isoformat() if doc.created_at else ""

    embeddings = encoder.encode(chunks)

    points = []
    for i, chunk in enumerate(chunks):
        metadata = {
            "source": filename,
            "document_id": doc.id,
            "document_name": filename,
            "document_created_at": now_str,
            "document_updated_at": now_str,
            "chunk_index": i,
            "chunk_total": len(chunks),
        }
        point_id = build_point_id(chunk, doc.id, filename, i)
        points.append(PointStruct(id=point_id, vector=embeddings[i].tolist(), payload={"text": chunk, **metadata}))

    client.upsert(collection_name=COLLECTION, points=points)

    return {"file": filename, "status": "indexed", "chunks": len(chunks), "doc_id": doc.id}


def main():
    if len(sys.argv) < 2:
        print("Usage: python reindex_from_files.py <directory>")
        print("Example: python reindex_from_files.py /home/teuzothedev/work/cv-teuzo")
        sys.exit(1)

    source_dir = sys.argv[1]
    if not os.path.isdir(source_dir):
        print(f"Error: {source_dir} is not a directory")
        sys.exit(1)

    files = []
    for f in os.listdir(source_dir):
        if f.endswith((".html", ".htm", ".pdf")):
            files.append(os.path.join(source_dir, f))

    logger.info("Found %d files in %s", len(files), source_dir)

    results = {"indexed": 0, "skipped": 0, "errors": 0}

    for filepath in sorted(files):
        try:
            result = index_file(filepath)
            if result["status"] == "indexed":
                results["indexed"] += 1
                logger.info("  OK %s (%d chunks)", result["file"], result["chunks"])
            else:
                results["skipped"] += 1
                logger.info("  SKIP %s (%s)", result["file"], result["reason"])
        except Exception as e:
            results["errors"] += 1
            logger.error("  ERROR %s: %s", os.path.basename(filepath), e)

    info = client.get_collection(COLLECTION)
    logger.info("Done! Indexed: %d, Skipped: %d, Errors: %d, Total points: %d",
                results["indexed"], results["skipped"], results["errors"], info.points_count)

    return results


if __name__ == "__main__":
    main()
