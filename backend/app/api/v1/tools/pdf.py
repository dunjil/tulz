"""PDF processing endpoints."""

import os
import time
import uuid
from typing import Optional

from fastapi import APIRouter, File, Form, Request, UploadFile
from fastapi.responses import FileResponse

from app.api.deps import ClientIP, DbSession, OptionalUser, UserAgent
from app.config import settings
from app.core.exceptions import BadRequestError
from app.core.file_validation import validate_pdf_file
from app.core.rate_limiter import limiter, PDF_RATE_LIMIT
from app.models.history import ToolType
from app.schemas.tools import PDFOperation, PDFResponse
from app.services.tools.pdf_service import PDFService
from app.services.usage_service import UsageService

router = APIRouter()

TEMP_DIR = settings.temp_file_dir
os.makedirs(TEMP_DIR, exist_ok=True)


@router.post("/split", response_model=PDFResponse)
@limiter.limit(PDF_RATE_LIMIT)
async def split_pdf(
    request: Request,  # Required for rate limiter
    file: UploadFile = File(...),
    page_ranges: str = Form(..., description="Page ranges like '1-5,6-10' or 'all'"),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Split PDF into multiple files by page ranges."""
    start_time = time.time()

    content = await file.read()
    if len(content) > settings.max_file_size_bytes:
        raise BadRequestError(message=f"File too large. Maximum size is {settings.max_file_size_mb}MB")

    # SECURITY: Validate file using magic bytes, not just Content-Type header
    is_valid, message = validate_pdf_file(content)
    if not is_valid:
        raise BadRequestError(message=f"Invalid file type. {message}")

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.PDF,
        operation="split",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={"file_size": len(content), "page_ranges": page_ranges},
    )

    # Process PDF
    pdf_service = PDFService()
    result_files, total_pages = await pdf_service.split(content, page_ranges)

    # Save result files
    saved_files = []
    total_size = 0

    for i, (pdf_bytes, pages) in enumerate(result_files):
        file_id = str(uuid.uuid4())
        filename = f"{file_id}.pdf"
        filepath = os.path.join(TEMP_DIR, filename)

        with open(filepath, "wb") as f:
            f.write(pdf_bytes)

        saved_files.append({
            "filename": f"split_{i+1}.pdf",
            "pages": len(pages),  # Return page count, not list
            "size": len(pdf_bytes),
            "download_url": f"/api/v1/tools/pdf/download/{filename}",
        })
        total_size += len(pdf_bytes)

    # Complete usage tracking
    processing_time = int((time.time() - start_time) * 1000)
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=processing_time,
        output_metadata={"files_created": len(saved_files), "total_size": total_size},
    )

    return PDFResponse(
        operation=PDFOperation.SPLIT,
        original_pages=total_pages,
        result_files=saved_files,
        total_size_bytes=total_size,
    )


@router.post("/merge", response_model=PDFResponse)
@limiter.limit(PDF_RATE_LIMIT)
async def merge_pdfs(
    request: Request,  # Required for rate limiter
    files: list[UploadFile] = File(...),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Merge multiple PDFs into one."""
    start_time = time.time()

    if len(files) < 2:
        raise BadRequestError(message="At least 2 PDF files are required for merging")

    if len(files) > 20:
        raise BadRequestError(message="Maximum 20 files can be merged at once")

    # Read all files
    pdf_contents = []
    total_input_size = 0

    for file in files:
        content = await file.read()
        total_input_size += len(content)

        if total_input_size > settings.max_file_size_bytes * 2:
            raise BadRequestError(message="Total file size too large")

        # SECURITY: Validate file using magic bytes, not just Content-Type header
        is_valid, message = validate_pdf_file(content)
        if not is_valid:
            raise BadRequestError(message=f"Invalid file type for {file.filename}: {message}")

        pdf_contents.append(content)

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.PDF,
        operation="merge",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={"file_count": len(files), "total_size": total_input_size},
    )

    # Merge PDFs
    pdf_service = PDFService()
    merged_bytes, total_pages = await pdf_service.merge(pdf_contents)

    # Save result
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.pdf"
    filepath = os.path.join(TEMP_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(merged_bytes)

    # Complete usage tracking
    processing_time = int((time.time() - start_time) * 1000)
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=processing_time,
        output_metadata={"total_pages": total_pages, "output_size": len(merged_bytes)},
    )

    return PDFResponse(
        operation=PDFOperation.MERGE,
        original_pages=total_pages,
        result_files=[{
            "filename": "merged.pdf",
            "pages": total_pages,
            "size": len(merged_bytes),
            "download_url": f"/api/v1/tools/pdf/download/{filename}",
        }],
        total_size_bytes=len(merged_bytes),
    )


@router.post("/compress", response_model=PDFResponse)
@limiter.limit(PDF_RATE_LIMIT)
async def compress_pdf(
    request: Request,  # Required for rate limiter
    file: UploadFile = File(...),
    compression_level: str = Form("medium", pattern=r"^(low|medium|high)$"),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Compress a PDF to reduce file size."""
    start_time = time.time()

    content = await file.read()
    original_size = len(content)

    if original_size > settings.max_file_size_bytes:
        raise BadRequestError(message=f"File too large. Maximum size is {settings.max_file_size_mb}MB")

    # SECURITY: Validate file using magic bytes, not just Content-Type header
    is_valid, message = validate_pdf_file(content)
    if not is_valid:
        raise BadRequestError(message=f"Invalid file type. {message}")

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.PDF,
        operation="compress",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={"file_size": original_size, "compression_level": compression_level},
    )

    # Compress PDF
    pdf_service = PDFService()
    compressed_bytes, total_pages = await pdf_service.compress(content, compression_level)

    # Save result
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.pdf"
    filepath = os.path.join(TEMP_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(compressed_bytes)

    compression_ratio = (1 - len(compressed_bytes) / original_size) * 100

    # Complete usage tracking
    processing_time = int((time.time() - start_time) * 1000)
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=processing_time,
        output_metadata={
            "original_size": original_size,
            "compressed_size": len(compressed_bytes),
            "compression_ratio": round(compression_ratio, 2),
        },
    )

    return PDFResponse(
        operation=PDFOperation.COMPRESS,
        original_pages=total_pages,
        result_files=[{
            "filename": "compressed.pdf",
            "pages": total_pages,
            "size": len(compressed_bytes),
            "download_url": f"/api/v1/tools/pdf/download/{filename}",
            "compression_ratio": f"{compression_ratio:.1f}%",
        }],
        total_size_bytes=len(compressed_bytes),
    )


@router.post("/to-word")
@limiter.limit(PDF_RATE_LIMIT)
async def pdf_to_word(
    request: Request,  # Required for rate limiter
    file: UploadFile = File(...),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Convert PDF to Word document."""
    start_time = time.time()

    content = await file.read()

    if len(content) > settings.max_file_size_bytes:
        raise BadRequestError(message=f"File too large. Maximum size is {settings.max_file_size_mb}MB")

    # SECURITY: Validate file using magic bytes, not just Content-Type header
    is_valid, message = validate_pdf_file(content)
    if not is_valid:
        raise BadRequestError(message=f"Invalid file type. {message}")

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.PDF,
        operation="to_word",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={"file_size": len(content)},
    )

    # Convert PDF to Word
    pdf_service = PDFService()
    docx_bytes, total_pages = await pdf_service.to_word(content)

    # Save result
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.docx"
    filepath = os.path.join(TEMP_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(docx_bytes)

    # Complete usage tracking
    processing_time = int((time.time() - start_time) * 1000)
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=processing_time,
        output_metadata={"total_pages": total_pages, "output_size": len(docx_bytes)},
    )

    return {
        "operation": "to_word",
        "original_pages": total_pages,
        "filename": "converted.docx",
        "size": len(docx_bytes),
        "download_url": f"/api/v1/tools/pdf/download/{filename}",
    }


@router.post("/remove-watermark")
@limiter.limit(PDF_RATE_LIMIT)
async def remove_watermark(
    request: Request,  # Required for rate limiter
    file: UploadFile = File(...),
    watermark_text: str = Form("", description="Specific watermark text to look for"),
    remove_images: bool = Form(False, description="Also remove small images that might be watermarks"),
    remove_text_watermarks: bool = Form(True, description="Remove text-based watermarks"),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """
    Attempt to remove watermarks from a PDF.

    Note: This works best on text overlay watermarks and annotation-based watermarks.
    Watermarks baked into page images may not be removable.
    """
    start_time = time.time()

    content = await file.read()
    original_size = len(content)

    if original_size > settings.max_file_size_bytes:
        raise BadRequestError(message=f"File too large. Maximum size is {settings.max_file_size_mb}MB")

    # SECURITY: Validate file using magic bytes, not just Content-Type header
    is_valid, message = validate_pdf_file(content)
    if not is_valid:
        raise BadRequestError(message=f"Invalid file type. {message}")

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.PDF,
        operation="remove_watermark",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={"file_size": original_size},
    )

    # Remove watermark
    pdf_service = PDFService()
    cleaned_bytes, total_pages, stats = await pdf_service.remove_watermark(
        content,
        watermark_text=watermark_text,
        remove_images=remove_images,
        remove_text_watermarks=remove_text_watermarks,
    )

    # Save result
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.pdf"
    filepath = os.path.join(TEMP_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(cleaned_bytes)

    # Complete usage tracking
    processing_time = int((time.time() - start_time) * 1000)
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=processing_time,
        output_metadata={
            "original_size": original_size,
            "output_size": len(cleaned_bytes),
            "removal_stats": stats,
        },
    )

    return {
        "operation": "remove_watermark",
        "original_pages": total_pages,
        "filename": "cleaned.pdf",
        "size": len(cleaned_bytes),
        "download_url": f"/api/v1/tools/pdf/download/{filename}",
        "removal_stats": stats,
    }


@router.post("/to-jpg")
@limiter.limit(PDF_RATE_LIMIT)
async def pdf_to_jpg(
    request: Request,
    file: UploadFile = File(...),
    quality: int = Form(95, ge=1, le=100),
    dpi: int = Form(200, ge=72, le=600),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Convert PDF pages to JPG images."""
    start_time = time.time()

    content = await file.read()
    if len(content) > settings.max_file_size_bytes:
        raise BadRequestError(message=f"File too large. Maximum size is {settings.max_file_size_mb}MB")

    # Validate PDF
    is_valid, message = validate_pdf_file(content)
    if not is_valid:
        raise BadRequestError(message=f"Invalid file type. {message}")

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.PDF,
        operation="to_jpg",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={"file_size": len(content), "quality": quality, "dpi": dpi},
    )

    # Convert to images
    pdf_service = PDFService()
    images, total_pages = await pdf_service.to_images(content, "jpeg", quality, dpi)

    # Save image files
    saved_files = []
    total_size = 0

    for i, img_bytes in enumerate(images):
        file_id = str(uuid.uuid4())
        filename = f"{file_id}.jpg"
        filepath = os.path.join(TEMP_DIR, filename)

        with open(filepath, "wb") as f:
            f.write(img_bytes)

        saved_files.append({
            "filename": f"page_{i+1}.jpg",
            "page": i + 1,
            "size": len(img_bytes),
            "download_url": f"/api/v1/tools/pdf/download/{filename}",
        })
        total_size += len(img_bytes)

    # Complete usage tracking
    processing_time = int((time.time() - start_time) * 1000)
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=processing_time,
        output_metadata={"images_created": len(saved_files), "total_size": total_size},
    )

    return {
        "operation": "to_jpg",
        "original_pages": total_pages,
        "result_files": saved_files,
        "total_size_bytes": total_size,
    }


@router.post("/from-jpg")
@limiter.limit(PDF_RATE_LIMIT)
async def jpg_to_pdf(
    request: Request,
    files: list[UploadFile] = File(...),
    page_size: str = Form("A4", pattern=r"^(A4|Letter|Legal|auto)$"),
    orientation: str = Form("portrait", pattern=r"^(portrait|landscape)$"),
    margin: int = Form(0, ge=0, le=100),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Convert JPG/PNG images to PDF."""
    start_time = time.time()

    if len(files) < 1:
        raise BadRequestError(message="At least 1 image file is required")

    if len(files) > 50:
        raise BadRequestError(message="Maximum 50 images can be converted at once")

    # Read all image files
    image_contents = []
    total_input_size = 0

    for file in files:
        content = await file.read()
        total_input_size += len(content)

        if total_input_size > settings.max_file_size_bytes * 3:
            raise BadRequestError(message="Total file size too large")

        image_contents.append(content)

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.PDF,
        operation="from_jpg",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={"file_count": len(files), "total_size": total_input_size},
    )

    # Convert to PDF
    pdf_service = PDFService()
    pdf_bytes, total_pages = await pdf_service.from_images(
        image_contents, page_size, orientation, margin
    )

    # Save result
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.pdf"
    filepath = os.path.join(TEMP_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(pdf_bytes)

    # Complete usage tracking
    processing_time = int((time.time() - start_time) * 1000)
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=processing_time,
        output_metadata={"total_pages": total_pages, "output_size": len(pdf_bytes)},
    )

    return {
        "operation": "from_jpg",
        "total_pages": total_pages,
        "filename": "converted.pdf",
        "size": len(pdf_bytes),
        "download_url": f"/api/v1/tools/pdf/download/{filename}",
    }


@router.post("/rotate")
@limiter.limit(PDF_RATE_LIMIT)
async def rotate_pdf(
    request: Request,
    file: UploadFile = File(...),
    rotation: int = Form(..., description="Rotation angle: 90, 180, 270, or -90"),
    pages: str = Form("all", description="Pages to rotate: 'all', 'even', 'odd', or '1,3,5-7'"),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Rotate PDF pages."""
    start_time = time.time()

    if rotation not in [90, 180, 270, -90]:
        raise BadRequestError(message="Rotation must be 90, 180, 270, or -90 degrees")

    content = await file.read()
    if len(content) > settings.max_file_size_bytes:
        raise BadRequestError(message=f"File too large. Maximum size is {settings.max_file_size_mb}MB")

    # Validate PDF
    is_valid, message = validate_pdf_file(content)
    if not is_valid:
        raise BadRequestError(message=f"Invalid file type. {message}")

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.PDF,
        operation="rotate",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={"file_size": len(content), "rotation": rotation, "pages": pages},
    )

    # Rotate PDF
    pdf_service = PDFService()
    rotated_bytes, total_pages = await pdf_service.rotate(content, rotation, pages)

    # Save result
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.pdf"
    filepath = os.path.join(TEMP_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(rotated_bytes)

    # Complete usage tracking
    processing_time = int((time.time() - start_time) * 1000)
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=processing_time,
        output_metadata={"total_pages": total_pages, "output_size": len(rotated_bytes)},
    )

    return {
        "operation": "rotate",
        "original_pages": total_pages,
        "filename": "rotated.pdf",
        "size": len(rotated_bytes),
        "download_url": f"/api/v1/tools/pdf/download/{filename}",
    }


@router.post("/unlock")
@limiter.limit(PDF_RATE_LIMIT)
async def unlock_pdf(
    request: Request,
    file: UploadFile = File(...),
    password: str = Form(..., description="Password to unlock the PDF"),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Remove password protection from PDF."""
    start_time = time.time()

    content = await file.read()
    if len(content) > settings.max_file_size_bytes:
        raise BadRequestError(message=f"File too large. Maximum size is {settings.max_file_size_mb}MB")

    # Validate PDF
    is_valid, message = validate_pdf_file(content)
    if not is_valid:
        raise BadRequestError(message=f"Invalid file type. {message}")

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.PDF,
        operation="unlock",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={"file_size": len(content)},
    )

    # Unlock PDF
    pdf_service = PDFService()
    unlocked_bytes, total_pages, was_encrypted = await pdf_service.unlock(content, password)

    # Save result
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.pdf"
    filepath = os.path.join(TEMP_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(unlocked_bytes)

    # Complete usage tracking
    processing_time = int((time.time() - start_time) * 1000)
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=processing_time,
        output_metadata={
            "total_pages": total_pages,
            "output_size": len(unlocked_bytes),
            "was_encrypted": was_encrypted,
        },
    )

    return {
        "operation": "unlock",
        "original_pages": total_pages,
        "filename": "unlocked.pdf",
        "size": len(unlocked_bytes),
        "was_encrypted": was_encrypted,
        "download_url": f"/api/v1/tools/pdf/download/{filename}",
    }


@router.post("/protect")
@limiter.limit(PDF_RATE_LIMIT)
async def protect_pdf(
    request: Request,
    file: UploadFile = File(...),
    password: str = Form(..., description="Password to protect the PDF"),
    allow_printing: bool = Form(True),
    allow_modification: bool = Form(False),
    allow_copying: bool = Form(False),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Add password protection to PDF."""
    start_time = time.time()

    content = await file.read()
    if len(content) > settings.max_file_size_bytes:
        raise BadRequestError(message=f"File too large. Maximum size is {settings.max_file_size_mb}MB")

    # Validate PDF
    is_valid, message = validate_pdf_file(content)
    if not is_valid:
        raise BadRequestError(message=f"Invalid file type. {message}")

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.PDF,
        operation="protect",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={"file_size": len(content)},
    )

    # Protect PDF
    pdf_service = PDFService()
    protected_bytes, total_pages = await pdf_service.protect(
        content, password, None, allow_printing, allow_modification, allow_copying
    )

    # Save result
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.pdf"
    filepath = os.path.join(TEMP_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(protected_bytes)

    # Complete usage tracking
    processing_time = int((time.time() - start_time) * 1000)
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=processing_time,
        output_metadata={"total_pages": total_pages, "output_size": len(protected_bytes)},
    )

    return {
        "operation": "protect",
        "original_pages": total_pages,
        "filename": "protected.pdf",
        "size": len(protected_bytes),
        "download_url": f"/api/v1/tools/pdf/download/{filename}",
    }


@router.post("/html-to-pdf")
@limiter.limit(PDF_RATE_LIMIT)
async def html_to_pdf(
    request: Request,
    html_content: Optional[str] = Form(None),
    url: Optional[str] = Form(None),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Convert HTML content or URL to PDF."""
    start_time = time.time()

    if not html_content and not url:
        raise BadRequestError(message="Either html_content or url must be provided")

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.PDF,
        operation="html_to_pdf",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={"has_html": bool(html_content), "has_url": bool(url)},
    )

    # Convert to PDF
    pdf_service = PDFService()
    pdf_bytes, estimated_pages = await pdf_service.html_to_pdf(html_content, url)

    # Save result
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.pdf"
    filepath = os.path.join(TEMP_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(pdf_bytes)

    # Complete usage tracking
    processing_time = int((time.time() - start_time) * 1000)
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=processing_time,
        output_metadata={"estimated_pages": estimated_pages, "output_size": len(pdf_bytes)},
    )

    return {
        "operation": "html_to_pdf",
        "estimated_pages": estimated_pages,
        "filename": "converted.pdf",
        "size": len(pdf_bytes),
        "download_url": f"/api/v1/tools/pdf/download/{filename}",
    }


@router.post("/word-to-pdf")
@limiter.limit(PDF_RATE_LIMIT)
async def word_to_pdf(
    request: Request,
    file: UploadFile = File(...),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Convert DOCX to PDF."""
    start_time = time.time()

    content = await file.read()
    if len(content) > settings.max_file_size_bytes:
        raise BadRequestError(message=f"File too large. Maximum size is {settings.max_file_size_mb}MB")

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.PDF,
        operation="word_to_pdf",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={"file_size": len(content)},
    )

    # Convert to PDF
    pdf_service = PDFService()
    pdf_bytes, total_pages = await pdf_service.from_docx(content)

    # Save result
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.pdf"
    filepath = os.path.join(TEMP_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(pdf_bytes)

    # Complete usage tracking
    processing_time = int((time.time() - start_time) * 1000)
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=processing_time,
        output_metadata={"total_pages": total_pages, "output_size": len(pdf_bytes)},
    )

    return {
        "operation": "word_to_pdf",
        "total_pages": total_pages,
        "filename": "converted.pdf",
        "size": len(pdf_bytes),
        "download_url": f"/api/v1/tools/pdf/download/{filename}",
    }


@router.post("/add-watermark")
@limiter.limit(PDF_RATE_LIMIT)
async def add_watermark(
    request: Request,
    file: UploadFile = File(...),
    text: str = Form(...),
    position: str = Form("center", pattern=r"^(center|top|bottom)$"),
    opacity: float = Form(0.3, ge=0.0, le=1.0),
    font_size: int = Form(40, ge=10, le=100),
    rotation: int = Form(45, ge=-180, le=180),
    color: str = Form("#808080"),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Add text watermark to PDF."""
    start_time = time.time()

    content = await file.read()
    if len(content) > settings.max_file_size_bytes:
        raise BadRequestError(message=f"File too large. Maximum size is {settings.max_file_size_mb}MB")

    # Validate PDF
    is_valid, message = validate_pdf_file(content)
    if not is_valid:
        raise BadRequestError(message=f"Invalid file type. {message}")

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.PDF,
        operation="add_watermark",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={"file_size": len(content), "text": text},
    )

    # Add watermark
    pdf_service = PDFService()
    watermarked_bytes, total_pages = await pdf_service.add_watermark_text(
        content, text, position, opacity, font_size, rotation, color
    )

    # Save result
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.pdf"
    filepath = os.path.join(TEMP_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(watermarked_bytes)

    # Complete usage tracking
    processing_time = int((time.time() - start_time) * 1000)
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=processing_time,
        output_metadata={"total_pages": total_pages, "output_size": len(watermarked_bytes)},
    )

    return {
        "operation": "add_watermark",
        "original_pages": total_pages,
        "filename": "watermarked.pdf",
        "size": len(watermarked_bytes),
        "download_url": f"/api/v1/tools/pdf/download/{filename}",
    }


@router.post("/add-page-numbers")
@limiter.limit(PDF_RATE_LIMIT)
async def add_page_numbers_endpoint(
    request: Request,
    file: UploadFile = File(...),
    position: str = Form("bottom-center"),
    format_string: str = Form("{page}"),
    font_size: int = Form(10, ge=6, le=24),
    start_page: int = Form(1, ge=1),
    margin: int = Form(20, ge=0, le=100),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Add page numbers to PDF."""
    start_time = time.time()

    content = await file.read()
    if len(content) > settings.max_file_size_bytes:
        raise BadRequestError(message=f"File too large. Maximum size is {settings.max_file_size_mb}MB")

    # Validate PDF
    is_valid, message = validate_pdf_file(content)
    if not is_valid:
        raise BadRequestError(message=f"Invalid file type. {message}")

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.PDF,
        operation="add_page_numbers",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={"file_size": len(content), "format": format_string},
    )

    # Add page numbers
    pdf_service = PDFService()
    numbered_bytes, total_pages = await pdf_service.add_page_numbers(
        content, position, format_string, font_size, start_page, margin
    )

    # Save result
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.pdf"
    filepath = os.path.join(TEMP_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(numbered_bytes)

    # Complete usage tracking
    processing_time = int((time.time() - start_time) * 1000)
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=processing_time,
        output_metadata={"total_pages": total_pages, "output_size": len(numbered_bytes)},
    )

    return {
        "operation": "add_page_numbers",
        "original_pages": total_pages,
        "filename": "numbered.pdf",
        "size": len(numbered_bytes),
        "download_url": f"/api/v1/tools/pdf/download/{filename}",
    }


@router.post("/organize")
@limiter.limit(PDF_RATE_LIMIT)
async def organize_pdf(
    request: Request,
    file: UploadFile = File(...),
    page_order: str = Form(..., description="Comma-separated page numbers (1-indexed), e.g., '1,3,2,4'"),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Organize PDF by reordering or deleting pages."""
    start_time = time.time()

    content = await file.read()
    if len(content) > settings.max_file_size_bytes:
        raise BadRequestError(message=f"File too large. Maximum size is {settings.max_file_size_mb}MB")

    # Validate PDF
    is_valid, message = validate_pdf_file(content)
    if not is_valid:
        raise BadRequestError(message=f"Invalid file type. {message}")

    # Parse page order
    try:
        page_list = [int(p.strip()) for p in page_order.split(",")]
    except ValueError:
        raise BadRequestError(message="Invalid page order. Must be comma-separated numbers like '1,3,2,4'")

    if not page_list:
        raise BadRequestError(message="Page order cannot be empty")

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.PDF,
        operation="organize",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={"file_size": len(content), "new_page_count": len(page_list)},
    )

    # Organize PDF
    pdf_service = PDFService()
    organized_bytes, total_pages = await pdf_service.organize(content, page_list)

    # Save result
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.pdf"
    filepath = os.path.join(TEMP_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(organized_bytes)

    # Complete usage tracking
    processing_time = int((time.time() - start_time) * 1000)
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=processing_time,
        output_metadata={"total_pages": total_pages, "output_size": len(organized_bytes)},
    )

    return {
        "operation": "organize",
        "original_pages": total_pages,
        "filename": "organized.pdf",
        "size": len(organized_bytes),
        "download_url": f"/api/v1/tools/pdf/download/{filename}",
    }


@router.post("/crop")
@limiter.limit(PDF_RATE_LIMIT)
async def crop_pdf(
    request: Request,
    file: UploadFile = File(...),
    left: int = Form(0, ge=0, le=500),
    top: int = Form(0, ge=0, le=500),
    right: int = Form(0, ge=0, le=500),
    bottom: int = Form(0, ge=0, le=500),
    pages: str = Form("all", description="Pages to crop: 'all', 'even', 'odd', or '1,3,5-7'"),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Crop PDF pages by removing margins."""
    start_time = time.time()

    content = await file.read()
    if len(content) > settings.max_file_size_bytes:
        raise BadRequestError(message=f"File too large. Maximum size is {settings.max_file_size_mb}MB")

    # Validate PDF
    is_valid, message = validate_pdf_file(content)
    if not is_valid:
        raise BadRequestError(message=f"Invalid file type. {message}")

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.PDF,
        operation="crop",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={"file_size": len(content), "margins": [left, top, right, bottom]},
    )

    # Crop PDF
    pdf_service = PDFService()
    cropped_bytes, total_pages = await pdf_service.crop(content, left, top, right, bottom, pages)

    # Save result
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.pdf"
    filepath = os.path.join(TEMP_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(cropped_bytes)

    # Complete usage tracking
    processing_time = int((time.time() - start_time) * 1000)
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=processing_time,
        output_metadata={"total_pages": total_pages, "output_size": len(cropped_bytes)},
    )

    return {
        "operation": "crop",
        "original_pages": total_pages,
        "filename": "cropped.pdf",
        "size": len(cropped_bytes),
        "download_url": f"/api/v1/tools/pdf/download/{filename}",
    }


@router.post("/excel-to-pdf")
@limiter.limit(PDF_RATE_LIMIT)
async def excel_to_pdf(
    request: Request,
    file: UploadFile = File(...),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Convert Excel (XLSX) to PDF."""
    start_time = time.time()

    content = await file.read()
    if len(content) > settings.max_file_size_bytes:
        raise BadRequestError(message=f"File too large. Maximum size is {settings.max_file_size_mb}MB")

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.PDF,
        operation="excel_to_pdf",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={"file_size": len(content)},
    )

    # Convert to PDF
    pdf_service = PDFService()
    pdf_bytes, total_pages = await pdf_service.from_excel(content)

    # Save result
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.pdf"
    filepath = os.path.join(TEMP_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(pdf_bytes)

    # Complete usage tracking
    processing_time = int((time.time() - start_time) * 1000)
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=processing_time,
        output_metadata={"total_pages": total_pages, "output_size": len(pdf_bytes)},
    )

    return {
        "operation": "excel_to_pdf",
        "total_pages": total_pages,
        "filename": "converted.pdf",
        "size": len(pdf_bytes),
        "download_url": f"/api/v1/tools/pdf/download/{filename}",
    }


@router.post("/powerpoint-to-pdf")
@limiter.limit(PDF_RATE_LIMIT)
async def powerpoint_to_pdf(
    request: Request,
    file: UploadFile = File(...),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Convert PowerPoint (PPTX) to PDF."""
    start_time = time.time()

    content = await file.read()
    if len(content) > settings.max_file_size_bytes:
        raise BadRequestError(message=f"File too large. Maximum size is {settings.max_file_size_mb}MB")

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.PDF,
        operation="powerpoint_to_pdf",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={"file_size": len(content)},
    )

    # Convert to PDF
    pdf_service = PDFService()
    pdf_bytes, total_pages = await pdf_service.from_powerpoint(content)

    # Save result
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.pdf"
    filepath = os.path.join(TEMP_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(pdf_bytes)

    # Complete usage tracking
    processing_time = int((time.time() - start_time) * 1000)
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=processing_time,
        output_metadata={"total_pages": total_pages, "output_size": len(pdf_bytes)},
    )

    return {
        "operation": "powerpoint_to_pdf",
        "total_pages": total_pages,
        "filename": "converted.pdf",
        "size": len(pdf_bytes),
        "download_url": f"/api/v1/tools/pdf/download/{filename}",
    }


@router.get("/download/{filename}")
async def download_pdf(filename: str):
    """Download processed PDF, DOCX, or image file."""
    if not filename or ".." in filename or "/" in filename:
        raise BadRequestError(message="Invalid filename")

    filepath = os.path.join(TEMP_DIR, filename)

    if not os.path.exists(filepath):
        raise BadRequestError(message="File not found or expired")

    # Determine media type
    if filename.endswith(".docx"):
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif filename.endswith(".jpg") or filename.endswith(".jpeg"):
        media_type = "image/jpeg"
    elif filename.endswith(".png"):
        media_type = "image/png"
    else:
        media_type = "application/pdf"

    return FileResponse(
        filepath,
        media_type=media_type,
        filename=filename,
    )
