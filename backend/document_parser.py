"""
Document parser for extracting text from PDFs and DOCX files.
Used by both the Startup Evaluation Engine and FinScope AI.
"""

import io
from typing import List

from PyPDF2 import PdfReader
from docx import Document


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract all text content from a PDF file."""
    reader = PdfReader(io.BytesIO(file_bytes))
    pages: List[str] = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text.strip())
    return "\n\n".join(pages)


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract all text content from a DOCX file."""
    doc = Document(io.BytesIO(file_bytes))
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    return "\n\n".join(paragraphs)


def extract_text(filename: str, file_bytes: bytes) -> str:
    """Route to the appropriate parser based on file extension."""
    lower = filename.lower()
    if lower.endswith(".pdf"):
        return extract_text_from_pdf(file_bytes)
    elif lower.endswith(".docx") or lower.endswith(".doc"):
        return extract_text_from_docx(file_bytes)
    elif lower.endswith(".txt"):
        return file_bytes.decode("utf-8", errors="replace")
    else:
        raise ValueError(f"Unsupported file type: {filename}")


def chunk_text(text: str, max_chars: int = 12000) -> str:
    """Truncate text to fit within Groq's context window.
    
    Keeps the beginning and end of the document which typically
    contain the most important information (title page + appendix).
    """
    if len(text) <= max_chars:
        return text

    half = max_chars // 2
    return (
        text[:half]
        + "\n\n[... middle content truncated for context window ...]\n\n"
        + text[-half:]
    )
