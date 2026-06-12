import io

from PyPDF2 import PdfReader

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
