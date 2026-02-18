"""File validation utilities for secure file uploads.

SECURITY: Validates file types using magic bytes (file signatures) rather than
relying solely on Content-Type headers which can be easily spoofed.
"""

from typing import Optional

# Magic bytes (file signatures) for common file types
# Reference: https://en.wikipedia.org/wiki/List_of_file_signatures
FILE_SIGNATURES = {
    # PDF files
    "pdf": [
        (b"%PDF", 0),  # PDF signature at start
    ],
    # Image files
    "png": [
        (b"\x89PNG\r\n\x1a\n", 0),  # PNG signature
    ],
    "jpeg": [
        (b"\xff\xd8\xff", 0),  # JPEG/JPG signature
    ],
    "jpg": [
        (b"\xff\xd8\xff", 0),  # JPEG/JPG signature (alias)
    ],
    "gif": [
        (b"GIF87a", 0),
        (b"GIF89a", 0),
    ],
    "webp": [
        (b"RIFF", 0),  # RIFF container (also check WEBP at offset 8)
    ],
    "bmp": [
        (b"BM", 0),  # Bitmap
    ],
    # Office documents
    "xlsx": [
        (b"PK\x03\x04", 0),  # ZIP-based (Office Open XML)
    ],
    "xls": [
        (b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1", 0),  # OLE Compound Document
    ],
    "docx": [
        (b"PK\x03\x04", 0),  # ZIP-based (Office Open XML)
    ],
}

# Additional validation for WebP (needs to check WEBP at offset 8)
def _validate_webp(content: bytes) -> bool:
    """Validate WebP file by checking both RIFF header and WEBP marker."""
    if len(content) < 12:
        return False
    return content[:4] == b"RIFF" and content[8:12] == b"WEBP"


def validate_file_signature(content: bytes, expected_type: str) -> bool:
    """
    Validate file content against expected file type using magic bytes.

    Args:
        content: File content bytes
        expected_type: Expected file type (e.g., 'pdf', 'png', 'jpeg')

    Returns:
        True if file signature matches expected type, False otherwise

    SECURITY: This prevents Content-Type spoofing attacks where malicious files
    are uploaded with fake Content-Type headers.
    """
    if not content or len(content) < 4:
        return False

    expected_type = expected_type.lower()

    # Special case for WebP
    if expected_type == "webp":
        return _validate_webp(content)

    # Check if we have signatures for this type
    if expected_type not in FILE_SIGNATURES:
        # Unknown type - be permissive but log warning
        return True

    signatures = FILE_SIGNATURES[expected_type]

    for signature, offset in signatures:
        if len(content) >= offset + len(signature):
            if content[offset:offset + len(signature)] == signature:
                return True

    return False


def get_file_type_from_content(content: bytes) -> Optional[str]:
    """
    Detect file type from content using magic bytes.

    Args:
        content: File content bytes

    Returns:
        Detected file type string, or None if unknown
    """
    if not content or len(content) < 4:
        return None

    # Check WebP first (special case)
    if _validate_webp(content):
        return "webp"

    # Check other types
    for file_type, signatures in FILE_SIGNATURES.items():
        if file_type == "webp":  # Skip, already checked
            continue
        for signature, offset in signatures:
            if len(content) >= offset + len(signature):
                if content[offset:offset + len(signature)] == signature:
                    return file_type

    return None


def validate_image_file(content: bytes, content_type: Optional[str] = None) -> tuple[bool, str]:
    """
    Validate that content is a valid image file.

    Args:
        content: File content bytes
        content_type: Optional Content-Type header value

    Returns:
        Tuple of (is_valid, detected_type_or_error_message)

    SECURITY: Validates actual file content, not just headers.
    """
    valid_image_types = {"png", "jpeg", "jpg", "gif", "webp", "bmp"}

    detected_type = get_file_type_from_content(content)

    if not detected_type:
        return False, "Unable to determine file type from content"

    if detected_type not in valid_image_types:
        return False, f"Invalid image type: {detected_type}"

    return True, detected_type


def validate_pdf_file(content: bytes) -> tuple[bool, str]:
    """
    Validate that content is a valid PDF file.

    Args:
        content: File content bytes

    Returns:
        Tuple of (is_valid, message)

    SECURITY: Validates actual file content, not just headers.
    """
    if not validate_file_signature(content, "pdf"):
        return False, "Invalid PDF file: file signature does not match"

    # Additional check: PDF should also contain %%EOF marker
    if b"%%EOF" not in content[-1024:]:  # Check last 1KB
        return False, "Invalid PDF file: missing EOF marker"

    return True, "Valid PDF"


def validate_excel_file(content: bytes, content_type: Optional[str] = None) -> tuple[bool, str]:
    """
    Validate that content is a valid Excel file.

    Args:
        content: File content bytes
        content_type: Optional Content-Type header value

    Returns:
        Tuple of (is_valid, detected_type_or_error_message)

    SECURITY: Validates actual file content, not just headers.
    """
    # Check for xlsx (ZIP-based)
    if validate_file_signature(content, "xlsx"):
        return True, "xlsx"

    # Check for xls (OLE)
    if validate_file_signature(content, "xls"):
        return True, "xls"

    return False, "Invalid Excel file: file signature does not match xlsx or xls format"
