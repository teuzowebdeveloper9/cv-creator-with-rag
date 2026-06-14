import os
import hashlib
import logging

from django.core.management.base import BaseCommand
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, Filter, FieldCondition, MatchAll
from sentence_transformers import SentenceTransformer
from api.models import Document

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Re-index Qdrant collection with proper metadata"

    def handle(self, *args, **options):
        host = os.getenv("QDRANT_HOST", "qdrant")
        port = int(os.getenv("QDRANT_PORT", 6333))
        collection = "user_context"

        client = QdrantClient(host=host, port=port, check_compatibility=False)
        encoder = SentenceTransformer("all-MiniLM-L6-v2")

        self.stdout.write(f"Fetching all points from '{collection}'...")

        all_points = []
        offset = None
        while True:
            result, offset = client.scroll(
                collection_name=collection,
                limit=200,
                offset=offset,
                with_payload=True,
                with_vectors=True,
            )
            all_points.extend(result)
            if offset is None:
                break

        self.stdout.write(f"Found {len(all_points)} points")

        new_points = []
        matched = 0
        unmatched = 0

        for point in all_points:
            payload = point.payload or {}
            text = payload.get("text", "")
            source = payload.get("source", "unknown")

            if not text.strip():
                continue

            doc = Document.objects.filter(name=source).first()
            if not doc:
                base = os.path.splitext(source)[0]
                doc = Document.objects.filter(name__icontains=base).first()

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

            material = "|".join([str(metadata["document_id"]), source, "0", text[:200]])
            new_id = int(hashlib.sha256(material.encode()).hexdigest()[:16], 16)

            new_points.append(
                PointStruct(
                    id=new_id,
                    vector=point.vector,
                    payload={"text": text, **metadata},
                )
            )

        self.stdout.write(f"Matched: {matched}, Unmatched: {unmatched}")
        self.stdout.write("Deleting old points...")

        client.delete(
            collection_name=collection,
            points_selector=Filter(must=[FieldCondition(key="text", match=MatchAll())]),
        )

        self.stdout.write(f"Inserting {len(new_points)} points...")
        batch_size = 100
        for i in range(0, len(new_points), batch_size):
            batch = new_points[i:i + batch_size]
            client.upsert(collection_name=collection, points=batch)
            self.stdout.write(f"  Batch {i // batch_size + 1}/{(len(new_points) + batch_size - 1) // batch_size}")

        info = client.get_collection(collection)
        self.stdout.write(self.style.SUCCESS(f"Done! Points: {info.points_count}"))
