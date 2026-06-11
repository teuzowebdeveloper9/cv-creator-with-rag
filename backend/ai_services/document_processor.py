import pdfplumber
from bs4 import BeautifulSoup
from typing import List
import io

class DocumentProcessor:
    @staticmethod
    def extract_from_pdf(file_content: bytes) -> str:
        text = ""
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        return text

    @staticmethod
    def extract_from_html(file_content: bytes) -> str:
        soup = BeautifulSoup(file_content, 'html.parser')
        # Remove script and style elements
        for script_or_style in soup(["script", "style"]):
            script_or_style.decompose()
        return soup.get_text(separator=' ', strip=True)

    @staticmethod
    def split_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        chunks = []
        for i in range(0, len(text), chunk_size - overlap):
            chunks.append(text[i:i + chunk_size])
        return chunks
