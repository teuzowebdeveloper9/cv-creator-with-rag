import io

import pytest
from PyPDF2 import PdfReader

from ai_services.blob_storage import BlobStorage, is_safe_blob_key
from ai_services.pdf_generator import PDFGenerator


def test_generate_pdf_from_markdown_returns_pdf_bytes():
    content = """
    # Mateus da Silva Oliveira

    ## Resumo profissional
    Desenvolvedor Full Stack — foco em Python, React e automação.

    ## Experiência
    - Criou APIs com Django, Celery e Redis
    - Entregou frontends em React/Vite com preview de PDF
    - Trabalhou com RAG, Qdrant e [Docker](https://docker.com)

    **Competências:** Python, TypeScript, Docker, IA generativa.
    """

    pdf_bytes = PDFGenerator.generate(content)

    assert isinstance(pdf_bytes, bytes)
    assert pdf_bytes.startswith(b"%PDF-")
    assert len(pdf_bytes) > 1400


def test_generate_pdf_handles_code_fences_and_symbols():
    content = """
    ```markdown
    # Currículo ✅

    ## Destaques
    • Liderança técnica
    • Arquitetura orientada a serviços
    ```
    """

    pdf_bytes = PDFGenerator.generate(content)

    assert pdf_bytes.startswith(b"%PDF-")


def test_generate_pdf_strips_ai_preamble_from_text():
    content = """
    Claro, aqui está o currículo otimizado:

    # Mateus da Silva Oliveira

    ## Resumo profissional
    Desenvolvedor Full Stack com foco em Python.
    """

    pdf_bytes = PDFGenerator.generate(content)
    reader = PdfReader(io.BytesIO(pdf_bytes))
    text = "\n".join(page.extract_text() or "" for page in reader.pages)

    assert "Mateus da Silva Oliveira" in text
    assert "Claro" not in text


def test_markdown_to_html_escapes_text_and_rejects_unsafe_links():
    content = """# <script>alert(1)</script>

## Links
[Perigoso](javascript:alert(1))
[Seguro](https://example.com)
"""

    html = PDFGenerator._markdown_to_html(content)

    assert "<script>" not in html
    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in html
    assert "javascript:" not in html
    assert 'href="https://example.com"' in html


def test_photo_source_rejects_external_urls_and_accepts_safe_sources():
    assert PDFGenerator._safe_photo_src("http://169.254.169.254/latest/meta-data") is None
    assert PDFGenerator._safe_photo_src("/api/profile/photo/file/profile_1.png") == (
        "/api/profile/photo/file/profile_1.png"
    )
    assert PDFGenerator._safe_photo_src("profile_1.png") == "/api/profile/photo/file/profile_1.png"
    assert PDFGenerator._safe_photo_src("data:image/png;base64,iVBORw0KGgo=") == (
        "data:image/png;base64,iVBORw0KGgo="
    )


def test_blob_key_helpers_scope_users_and_reject_traversal():
    scoped_key = BlobStorage.scoped_key("cv.pdf", user_id="user@example.com", namespace="pdfs")

    assert scoped_key.endswith("/pdfs/cv.pdf")
    assert is_safe_blob_key(scoped_key)
    assert not is_safe_blob_key("../cv.pdf")
    assert not is_safe_blob_key("/absolute/cv.pdf")
    with pytest.raises(ValueError):
        BlobStorage.scoped_key("../cv.pdf", user_id="user-a", namespace="pdfs")
