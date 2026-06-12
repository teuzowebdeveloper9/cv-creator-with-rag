import base64
from celery import shared_task
from ai_services import DocumentProcessor, QdrantVectorStore
from .models import Document

@shared_task
def process_document_task(document_id, file_content_b64):
    try:
        doc = Document.objects.get(id=document_id)
        doc.status = 'PROCESSING'
        doc.save()

        processor = DocumentProcessor()
        vector_store = QdrantVectorStore()
        
        file_content = base64.b64decode(file_content_b64)
        text = ""
        
        file_name_lower = doc.name.lower()
        if file_name_lower.endswith('.pdf'):
            text = processor.extract_from_pdf(file_content)
        elif file_name_lower.endswith('.html') or file_name_lower.endswith('.htm'):
            text = processor.extract_from_html(file_content)
        else:
            doc.status = 'FAILED'
            doc.error_message = f"Unsupported file format: {doc.name}"
            doc.save()
            return {"error": doc.error_message}
        
        if not text.strip():
            doc.status = 'FAILED'
            doc.error_message = "No text could be extracted from the file."
            doc.save()
            return {"error": doc.error_message}

        chunks = processor.split_text(text)
        created_at = doc.created_at.isoformat() if doc.created_at else ""
        updated_at = doc.updated_at.isoformat() if doc.updated_at else ""
        metadatas = [
            {
                "source": doc.name,
                "document_id": doc.id,
                "document_name": doc.name,
                "document_created_at": created_at,
                "document_updated_at": updated_at,
                "chunk_index": index,
                "chunk_total": len(chunks),
            }
            for index, _ in enumerate(chunks)
        ]
        vector_store.upsert(collection_name="user_context", texts=chunks, metadatas=metadatas)
        
        doc.status = 'SUCCESS'
        doc.save()
        return {"file": doc.name, "chunks": len(chunks)}
    except Exception as e:
        if 'doc' in locals():
            doc.status = 'FAILED'
            doc.error_message = str(e)
            doc.save()
        return {"error": str(e)}
