import io
import logging
import xml.etree.ElementTree as ET
import zipfile

import pypdf

logger = logging.getLogger(__name__)


def extract_text_from_pdf(content: bytes) -> str:
    """Extract readable text from PDF bytes comprehensively across all pages."""
    try:
        reader = pypdf.PdfReader(io.BytesIO(content))
        text_parts: list[str] = []
        for page in reader.pages:
            try:
                page_text = page.extract_text(extraction_mode="layout")
            except Exception:
                page_text = page.extract_text()

            if not page_text:
                page_text = page.extract_text()

            if page_text:
                text_parts.append(page_text.strip())

        return "\n\n".join(text_parts).strip()
    except Exception as e:
        logger.warning("PDF layout extraction failed, attempting fallback: %s", e)
        try:
            reader = pypdf.PdfReader(io.BytesIO(content))
            return "\n\n".join([p.extract_text() or "" for p in reader.pages]).strip()
        except Exception as e2:
            logger.warning("PDF fallback extraction failed: %s", e2)
            return ""


def extract_text_from_docx(content: bytes) -> str:
    """Extract readable text from DOCX bytes with preserved paragraph structure."""
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as docx_zip:
            xml_content = docx_zip.read("word/document.xml")
            tree = ET.fromstring(xml_content)
            namespaces = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
            paragraphs = tree.findall(".//w:p", namespaces)
            if not paragraphs:
                paragraphs = tree.findall(".//p")

            lines: list[str] = []
            for p in paragraphs:
                text_nodes = p.findall(".//w:t", namespaces) or p.findall(".//t")
                line = "".join([node.text for node in text_nodes if node.text]).strip()
                if line:
                    lines.append(line)
            return "\n".join(lines).strip()
    except Exception as e:
        logger.warning("DOCX extraction failed: %s", e)
        return ""


def extract_resume_text(filename: str, content: bytes) -> str:
    """Extracts raw text content from uploaded PDF, DOCX, or text bytes."""
    lower = filename.lower()
    if lower.endswith(".pdf"):
        text = extract_text_from_pdf(content)
        if text:
            return text
    elif lower.endswith(".docx"):
        text = extract_text_from_docx(content)
        if text:
            return text

    # Fallback to UTF-8 decoding
    try:
        return content.decode("utf-8", errors="ignore").strip()
    except Exception:
        return ""
