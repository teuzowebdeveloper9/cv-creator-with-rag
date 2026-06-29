import base64
import logging
from celery import shared_task
from ai_services import DocumentProcessor, QdrantVectorStore
from .models import Document

logger = logging.getLogger(__name__)

@shared_task
def process_document_task(document_id, file_content_b64, user_id=None):
    logger.info("Document processing started: doc_id=%s, user_id=%s", document_id, user_id)
    try:
        doc_query = Document.objects.filter(id=document_id)
        if user_id is not None:
            doc_query = doc_query.filter(owner_id=user_id)
        doc = doc_query.get()
        doc.status = 'PROCESSING'
        doc.save()
        logger.debug("Document %s status set to PROCESSING", document_id)

        processor = DocumentProcessor()
        vector_store = QdrantVectorStore()

        file_content = base64.b64decode(file_content_b64)
        logger.debug("Decoded file content: %d bytes for doc %s", len(file_content), document_id)
        text = ""

        file_name_lower = doc.name.lower()
        if file_name_lower.endswith('.pdf'):
            logger.info("Extracting text from PDF: %s", doc.name)
            text = processor.extract_from_pdf(file_content)
        elif file_name_lower.endswith('.html') or file_name_lower.endswith('.htm'):
            logger.info("Extracting text from HTML: %s", doc.name)
            text = processor.extract_from_html(file_content)
        else:
            doc.status = 'FAILED'
            doc.error_message = f"Unsupported file format: {doc.name}"
            doc.save()
            logger.error("Unsupported file format: %s (doc_id=%s)", doc.name, document_id)
            return {"error": doc.error_message}

        if not text.strip():
            doc.status = 'FAILED'
            doc.error_message = "No text could be extracted from the file."
            doc.save()
            logger.warning("No text extracted from %s (doc_id=%s)", doc.name, document_id)
            return {"error": doc.error_message}

        logger.info("Text extracted: %d chars from %s", len(text), doc.name)

        chunks = processor.split_text(text)
        logger.info("Text split into %d chunks for %s", len(chunks), doc.name)

        created_at = doc.created_at.isoformat() if doc.created_at else ""
        updated_at = doc.updated_at.isoformat() if doc.updated_at else ""
        metadatas = [
            {
                "source": doc.name,
                "document_id": doc.id,
                "owner_user_id": doc.owner_id,
                "document_name": doc.name,
                "document_created_at": created_at,
                "document_updated_at": updated_at,
                "chunk_index": index,
                "chunk_total": len(chunks),
            }
            for index, _ in enumerate(chunks)
        ]
        vector_store.upsert(collection_name="user_context", texts=chunks, metadatas=metadatas)
        logger.info("Upserted %d chunks to Qdrant for %s", len(chunks), doc.name)

        doc.status = 'SUCCESS'
        doc.save()
        logger.info("Document processing completed: %s (doc_id=%s, chunks=%d)", doc.name, document_id, len(chunks))
        return {"file": doc.name, "chunks": len(chunks), "owner_user_id": doc.owner_id}
    except Exception as e:
        logger.error("Document processing failed: doc_id=%s, error=%s", document_id, e, exc_info=True)
        if 'doc' in locals():
            doc.status = 'FAILED'
            doc.error_message = str(e)
            doc.save()
        return {"error": str(e)}
