from app.errors.codes import ErrorCode
from app.errors.exceptions import AppError

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
_ALLOWED_EXTENSIONS = (".pdf", ".docx")
_PDF_MAGIC = b"%PDF"
_DOCX_MAGIC = b"PK\x03\x04"  # DOCX is a zip archive


def validate_resume_upload(filename: str, content: bytes) -> None:
    """Extension, size, and MIME-sniffed magic-byte checks — the frontend's own
    10MB/PDF/DOCX limit is a UX hint, not a security boundary (see API-CONTRACT.md)."""
    if len(content) > MAX_UPLOAD_BYTES:
        raise AppError(
            413, ErrorCode.FILE_TOO_LARGE, "That file is larger than the 10MB limit."
        )

    if not filename.lower().endswith(_ALLOWED_EXTENSIONS):
        raise AppError(415, ErrorCode.UNSUPPORTED_FILE_TYPE, "Upload a PDF or DOCX file.")

    if not (content.startswith(_PDF_MAGIC) or content.startswith(_DOCX_MAGIC)):
        raise AppError(
            415,
            ErrorCode.UNSUPPORTED_FILE_TYPE,
            "That file doesn't look like a valid PDF or DOCX.",
        )
