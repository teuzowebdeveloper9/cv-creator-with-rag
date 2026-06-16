import pdfplumber
from bs4 import BeautifulSoup
from typing import List
import io

class DocumentProcessor:
    MAX_PDF_PAGES = 50
    MAX_HTML_BYTES = 2 * 1024 * 1024
    MAX_EXTRACTED_TEXT_CHARS = 200_000
    MAX_CHUNKS = 500

    @staticmethod
    def extract_from_pdf(
        file_content: bytes,
        max_pages: int = MAX_PDF_PAGES,
        max_chars: int = MAX_EXTRACTED_TEXT_CHARS,
    ) -> str:
        parts = []
        remaining_chars = max(max_chars, 0)
        if remaining_chars == 0:
            return ""

        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            for page in pdf.pages[:max_pages]:
                extracted = page.extract_text()
                if extracted:
                    chunk = (extracted + "\n")[:remaining_chars]
                    parts.append(chunk)
                    remaining_chars -= len(chunk)
                    if remaining_chars <= 0:
                        break
        return "".join(parts)

    @staticmethod
    def extract_from_html(
        file_content: bytes,
        max_bytes: int = MAX_HTML_BYTES,
        max_chars: int = MAX_EXTRACTED_TEXT_CHARS,
    ) -> str:
        bounded_content = file_content[:max_bytes]
        soup = BeautifulSoup(bounded_content, 'html.parser')
        # Remove script and style elements
        for script_or_style in soup(["script", "style"]):
            script_or_style.decompose()
        return soup.get_text(separator=' ', strip=True)[:max_chars]

    @staticmethod
    def split_text(
        text: str,
        chunk_size: int = 1000,
        overlap: int = 200,
        max_chunks: int = MAX_CHUNKS,
        max_chars: int = MAX_EXTRACTED_TEXT_CHARS,
    ) -> List[str]:
        if chunk_size <= 0:
            raise ValueError("chunk_size must be positive")
        if overlap < 0:
            raise ValueError("overlap must not be negative")
        if overlap >= chunk_size:
            raise ValueError("overlap must be smaller than chunk_size")

        text = text[:max_chars]
        chunks = []
        step = chunk_size - overlap
        for i in range(0, len(text), step):
            chunks.append(text[i:i + chunk_size])
            if len(chunks) >= max_chunks:
                break
        return chunks
