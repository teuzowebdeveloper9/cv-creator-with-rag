import pytest
from ai_services.document_processor import DocumentProcessor
import os

@pytest.fixture
def fixtures_path():
    return os.path.join(os.path.dirname(__file__), "fixtures")

def test_extract_from_pdf(fixtures_path):
    pdf_path = os.path.join(fixtures_path, "cv-mateus.pdf")
    with open(pdf_path, "rb") as f:
        content = f.read()
    
    text = DocumentProcessor.extract_from_pdf(content)
    assert "Mateus da Silva Oliveira" in text
    assert "Desenvolvedor Full Stack" in text
    assert len(text) > 100

def test_extract_from_html(fixtures_path):
    html_path = os.path.join(fixtures_path, "cv-python.html")
    with open(html_path, "rb") as f:
        content = f.read()
    
    text = DocumentProcessor.extract_from_html(content)
    assert "Mateus da Silva Oliveira" in text
    assert "Python" in text
    assert "FastAPI" in text
    assert len(text) > 100

def test_extract_from_html_applies_bounds():
    content = b"<html><body><script>alert(1)</script><p>ABCDE</p><p>FGHIJ</p></body></html>"

    text = DocumentProcessor.extract_from_html(content, max_bytes=1000, max_chars=6)

    assert text == "ABCDE "

def test_split_text():
    text = "A" * 2000
    chunks = DocumentProcessor.split_text(text, chunk_size=1000, overlap=200)
    
    # First chunk: 0 to 1000
    # Next start: 1000 - 200 = 800
    # Second chunk: 800 to 1800
    # Next start: 1800 - 200 = 1600
    # Third chunk: 1600 to 2600 (stops at 2000)
    assert len(chunks) == 3
    assert len(chunks[0]) == 1000
    assert len(chunks[1]) == 1000
    assert len(chunks[2]) == 400

def test_split_text_rejects_invalid_overlap():
    with pytest.raises(ValueError):
        DocumentProcessor.split_text("abc", chunk_size=100, overlap=100)

def test_split_text_limits_number_of_chunks():
    chunks = DocumentProcessor.split_text("A" * 5000, chunk_size=1000, overlap=0, max_chunks=2)

    assert len(chunks) == 2
