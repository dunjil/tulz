"""OCR (Optical Character Recognition) API endpoints.

Provides text extraction from images and scanned PDFs.

FEATURES:
- Image → Text: Extract text from photos, screenshots, scans
- PDF → Searchable PDF: Make scanned PDFs searchable
- PDF → Text: Extract text from scanned PDFs
- OCR → Word: Convert scanned documents to Word

LIMITATIONS:
- Works best with clear, printed text
- Handwriting recognition is NOT supported
- Table structure is NOT preserved
- Complex layouts may lose formatting
"""

import os
import time
import uuid
from typing import Optional

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import FileResponse

from app.api.deps import ClientIP, DbSession, OptionalUser, UserAgent
from app.config import settings
from app.core.exceptions import BadRequestError
from app.core.rate_limiter import limiter, TOOL_RATE_LIMIT_FREE, TOOL_RATE_LIMIT_PRO
from app.models.history import ToolType
from app.services.tools.ocr_service import OCRService, SUPPORTED_LANGUAGES, TIER_LIMITS
from app.services.usage_service import UsageService

router = APIRouter()

# Temp file storage
TEMP_DIR = settings.temp_file_dir
os.makedirs(TEMP_DIR, exist_ok=True)

# Allowed file types
ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/bmp", "image/tiff"}
ALLOWED_PDF_TYPE = "application/pdf"


def validate_image_file(content_type: str, filename: str) -> bool:
    """Validate image file type."""
    if content_type not in ALLOWED_IMAGE_TYPES:
        return False
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    return ext in {"png", "jpg", "jpeg", "webp", "bmp", "tiff", "tif"}


def validate_pdf_file(content_type: str, filename: str) -> bool:
    """Validate PDF file type."""
    if content_type != ALLOWED_PDF_TYPE:
        return False
    return filename.lower().endswith(".pdf")


@router.post("/image-to-text")
@limiter.limit(TOOL_RATE_LIMIT_FREE)
async def image_to_text(
    request,
    file: UploadFile = File(...),
    language: str = Form("eng"),
    use_preprocessing: bool = Form(True),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Extract text from an image using OCR.

    Supports: PNG, JPEG, WebP, BMP, TIFF

    NEW FEATURES:
    - Image preprocessing for better accuracy (Pro tier)
    - Quality assessment with warnings
    - Language detection

    LIMITATIONS:
    - Best with printed text (not handwriting)
    - Clear, high-contrast images work best
    - Rotated text may not be detected
    """
    start_time = time.time()

    # Validate file type
    if not validate_image_file(file.content_type, file.filename):
        raise BadRequestError(
            message="Invalid file type. Supported: PNG, JPEG, WebP, BMP, TIFF"
        )

    # Read file content
    content = await file.read()

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.OCR,
        operation="image_to_text",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={
            "filename": file.filename,
            "size": len(content),
            "language": language,
            "preprocessing": use_preprocessing,
        },
    )

    # Process OCR with new features
    ocr_service = OCRService()
    try:
        result = await ocr_service.extract_text_from_image(
            image_bytes=content,
            language=language,
            tier=tier,
            use_preprocessing=use_preprocessing,
        )
    except Exception as e:
        processing_time = int((time.time() - start_time) * 1000)
        await usage_service.complete_usage(
            history=history,
            processing_time_ms=processing_time,
            success=False,
            error_message=str(e),
        )
        raise

    # Complete usage tracking
    processing_time = int((time.time() - start_time) * 1000)
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=processing_time,
        output_metadata={
            "word_count": result["word_count"],
            "confidence": result["confidence"],
            "quality": result.get("quality", {}).get("quality", "unknown"),
        },
    )

    # Save text to downloadable file
    text_filename = f"ocr_text_{uuid.uuid4().hex[:8]}.txt"
    text_path = os.path.join(TEMP_DIR, text_filename)
    with open(text_path, "w", encoding="utf-8") as f:
        f.write(result["text"])

    return {
        **result,
        "download_url": f"/api/v1/tools/ocr/download/{text_filename}",
        "tier": tier,
        "processing_time_ms": processing_time,
    }


@router.post("/pdf-to-searchable")
@limiter.limit(TOOL_RATE_LIMIT_FREE)
async def pdf_to_searchable(
    request,
    file: UploadFile = File(...),
    language: str = Form("eng"),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Convert a scanned PDF to a searchable PDF.

    Adds an invisible text layer to scanned PDFs, making them:
    - Searchable (Ctrl+F)
    - Copyable (select and copy text)
    - Indexable by search engines

    LIMITATIONS:
    - Free tier: 1 page max
    - Pro tier: 20 pages max
    - Works best with clear scans
    - Handwriting is NOT supported
    """
    start_time = time.time()

    # Validate file type
    if not validate_pdf_file(file.content_type, file.filename):
        raise BadRequestError(message="Invalid file type. Please upload a PDF file.")

    # Read file content
    content = await file.read()

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.OCR,
        operation="pdf_to_searchable",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={
            "filename": file.filename,
            "size": len(content),
            "language": language,
        },
    )

    # Process OCR
    ocr_service = OCRService()
    try:
        result = await ocr_service.create_searchable_pdf(
            pdf_bytes=content,
            language=language,
            tier=tier,
        )
    except Exception as e:
        processing_time = int((time.time() - start_time) * 1000)
        await usage_service.complete_usage(
            history=history,
            processing_time_ms=processing_time,
            success=False,
            error_message=str(e),
        )
        raise

    # Complete usage tracking
    processing_time = int((time.time() - start_time) * 1000)
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=processing_time,
        output_metadata={
            "page_count": result["page_count"],
            "output_size": result["size"],
        },
    )

    return {
        "success": True,
        "filename": result["filename"],
        "page_count": result["page_count"],
        "size": result["size"],
        "language": result["language"],
        "language_name": result["language_name"],
        "download_url": f"/api/v1/tools/ocr/download/{result['filename']}",
        "tier": tier,
        "processing_time_ms": processing_time,
    }


@router.post("/pdf-to-text")
@limiter.limit(TOOL_RATE_LIMIT_FREE)
async def pdf_to_text(
    request,
    file: UploadFile = File(...),
    language: str = Form("eng"),
    use_preprocessing: bool = Form(True),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Extract text from a scanned PDF.

    Converts each page to an image and runs OCR.

    NEW FEATURES:
    - Image preprocessing for better accuracy (Pro tier)
    - Quality assessment with warnings
    - Language detection

    LIMITATIONS:
    - Free tier: 1 page max
    - Pro tier: 20 pages max
    - Table structure is NOT preserved
    - Formatting is lost
    """
    start_time = time.time()

    # Validate file type
    if not validate_pdf_file(file.content_type, file.filename):
        raise BadRequestError(message="Invalid file type. Please upload a PDF file.")

    # Read file content
    content = await file.read()

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.OCR,
        operation="pdf_to_text",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={
            "filename": file.filename,
            "size": len(content),
            "language": language,
            "preprocessing": use_preprocessing,
        },
    )

    # Process OCR with new features
    ocr_service = OCRService()
    try:
        result = await ocr_service.extract_text_from_pdf(
            pdf_bytes=content,
            language=language,
            tier=tier,
            use_preprocessing=use_preprocessing,
        )
    except Exception as e:
        processing_time = int((time.time() - start_time) * 1000)
        await usage_service.complete_usage(
            history=history,
            processing_time_ms=processing_time,
            success=False,
            error_message=str(e),
        )
        raise

    # Complete usage tracking
    processing_time = int((time.time() - start_time) * 1000)
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=processing_time,
        output_metadata={
            "word_count": result["word_count"],
            "page_count": result["page_count"],
            "confidence": result["confidence"],
            "quality": result.get("quality", {}).get("quality", "unknown"),
        },
    )

    # Save text to downloadable file
    text_filename = f"ocr_text_{uuid.uuid4().hex[:8]}.txt"
    text_path = os.path.join(TEMP_DIR, text_filename)
    with open(text_path, "w", encoding="utf-8") as f:
        f.write(result["text"])

    return {
        **result,
        "download_url": f"/api/v1/tools/ocr/download/{text_filename}",
        "tier": tier,
        "processing_time_ms": processing_time,
    }


@router.post("/to-word")
@limiter.limit(TOOL_RATE_LIMIT_FREE)
async def ocr_to_word(
    request,
    file: UploadFile = File(...),
    language: str = Form("eng"),
    use_preprocessing: bool = Form(True),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Convert scanned image or PDF to an editable Word document.

    Supports: Images (PNG, JPEG, etc.) and PDFs

    NEW FEATURES:
    - Image preprocessing for better accuracy (Pro tier)
    - Quality warnings included in document
    - Language detection

    LIMITATIONS:
    - Formatting is simplified
    - Table structure is NOT preserved
    - Images in document are NOT included
    - Free tier: 1 page (PDF) or 1 image
    - Pro tier: 20 pages (PDF)
    """
    start_time = time.time()

    # Determine file type
    is_image = validate_image_file(file.content_type, file.filename)
    is_pdf = validate_pdf_file(file.content_type, file.filename)

    if not is_image and not is_pdf:
        raise BadRequestError(
            message="Invalid file type. Supported: PNG, JPEG, WebP, BMP, TIFF, PDF"
        )

    file_type = "image" if is_image else "pdf"

    # Read file content
    content = await file.read()

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.OCR,
        operation="ocr_to_word",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={
            "filename": file.filename,
            "size": len(content),
            "file_type": file_type,
            "language": language,
            "preprocessing": use_preprocessing,
        },
    )

    # Process OCR with new features
    ocr_service = OCRService()
    try:
        result = await ocr_service.ocr_to_word(
            file_bytes=content,
            file_type=file_type,
            language=language,
            tier=tier,
            use_preprocessing=use_preprocessing,
        )
    except Exception as e:
        processing_time = int((time.time() - start_time) * 1000)
        await usage_service.complete_usage(
            history=history,
            processing_time_ms=processing_time,
            success=False,
            error_message=str(e),
        )
        raise

    # Complete usage tracking
    processing_time = int((time.time() - start_time) * 1000)
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=processing_time,
        output_metadata={
            "word_count": result["word_count"],
            "confidence": result["confidence"],
            "output_size": result["size"],
            "quality": result.get("quality", {}).get("quality", "unknown") if result.get("quality") else "unknown",
        },
    )

    return {
        "success": True,
        "filename": result["filename"],
        "size": result["size"],
        "word_count": result["word_count"],
        "confidence": result["confidence"],
        "language": result["language"],
        "language_name": result["language_name"],
        "quality": result.get("quality"),
        "download_url": f"/api/v1/tools/ocr/download/{result['filename']}",
        "tier": tier,
        "processing_time_ms": processing_time,
    }


@router.get("/download/{filename}")
async def download_file(filename: str):
    """Download OCR result file."""
    # Validate filename
    if not filename or ".." in filename or "/" in filename:
        raise BadRequestError(message="Invalid filename")

    # Only allow specific extensions
    allowed_extensions = (".txt", ".pdf", ".docx")
    if not any(filename.endswith(ext) for ext in allowed_extensions):
        raise BadRequestError(message="Invalid file type")

    filepath = os.path.join(TEMP_DIR, filename)

    if not os.path.exists(filepath):
        raise BadRequestError(message="File not found or expired")

    # Determine media type
    if filename.endswith(".txt"):
        media_type = "text/plain"
    elif filename.endswith(".pdf"):
        media_type = "application/pdf"
    elif filename.endswith(".docx"):
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    else:
        media_type = "application/octet-stream"

    return FileResponse(
        filepath,
        media_type=media_type,
        filename=filename,
    )


@router.get("/languages")
async def get_supported_languages(
    user: OptionalUser = None,
    session: DbSession = None,
    client_ip: ClientIP = None,
):
    """Get list of supported OCR languages based on user tier."""
    usage_service = UsageService(session)
    remaining = await usage_service.get_remaining_uses(user=user, ip_address=client_ip)
    tier = remaining.get("tier", "free")

    ocr_service = OCRService()
    languages = ocr_service.get_supported_languages(tier)
    limits = ocr_service.get_tier_limits(tier)

    return {
        "tier": tier,
        "languages": languages,
        "limits": limits,
        "all_languages": [
            {"code": code, "name": name}
            for code, name in SUPPORTED_LANGUAGES.items()
        ],
    }


@router.get("/limits")
async def get_tier_limits(
    user: OptionalUser = None,
    session: DbSession = None,
    client_ip: ClientIP = None,
):
    """Get OCR limits for current user's tier."""
    usage_service = UsageService(session)
    remaining = await usage_service.get_remaining_uses(user=user, ip_address=client_ip)
    tier = remaining.get("tier", "free")

    return {
        "tier": tier,
        "limits": TIER_LIMITS.get(tier, TIER_LIMITS["free"]),
        "all_tiers": TIER_LIMITS,
    }
