"""PDF Filler endpoints for filling forms, adding signatures, and annotations."""

import json
import os
import time
import uuid
from typing import Optional

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import FileResponse, Response

from app.api.deps import ClientIP, DbSession, OptionalUser, UserAgent
from app.config import settings
from app.core.exceptions import BadRequestError
from app.models.history import ToolType
from app.services.tools.pdf_filler_service import PDFFillerService
from app.services.usage_service import UsageService

router = APIRouter()

TEMP_DIR = settings.temp_file_dir
os.makedirs(TEMP_DIR, exist_ok=True)


@router.post("/info")
async def get_pdf_info(
    file: UploadFile = File(...),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Get PDF information including page count, dimensions, and form fields."""
    content = await file.read()

    if len(content) > settings.max_file_size_bytes:
        raise BadRequestError(
            message=f"File too large. Maximum size is {settings.max_file_size_mb}MB"
        )

    if not file.content_type or "pdf" not in file.content_type.lower():
        raise BadRequestError(message="Invalid file type. Please upload a PDF.")

    pdf_service = PDFFillerService()
    info = await pdf_service.get_pdf_info(content)

    # Store the PDF temporarily for subsequent operations
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.pdf"
    filepath = os.path.join(TEMP_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    return {
        "file_id": file_id,
        "filename": file.filename,
        **info,
    }


@router.get("/render/{file_id}/{page}")
async def render_page(
    file_id: str,
    page: int,
    scale: float = 2.0,
):
    """Render a PDF page as an image for canvas display."""
    if not file_id or ".." in file_id or "/" in file_id:
        raise BadRequestError(message="Invalid file ID")

    filepath = os.path.join(TEMP_DIR, f"{file_id}.pdf")

    if not os.path.exists(filepath):
        raise BadRequestError(message="File not found or expired")

    with open(filepath, "rb") as f:
        content = f.read()

    pdf_service = PDFFillerService()
    img_bytes, width, height = await pdf_service.render_page_to_image(
        content, page, scale
    )

    return Response(
        content=img_bytes,
        media_type="image/png",
        headers={
            "X-Image-Width": str(width),
            "X-Image-Height": str(height),
        },
    )


@router.post("/fill")
async def fill_pdf(
    file: UploadFile = File(...),
    annotations: str = Form(..., description="JSON array of annotations"),
    canvas_scale: Optional[str] = Form(None, description="Canvas scale from frontend"),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Fill PDF with annotations (text, signatures, drawings, etc.)."""
    start_time = time.time()

    content = await file.read()

    if len(content) > settings.max_file_size_bytes:
        raise BadRequestError(
            message=f"File too large. Maximum size is {settings.max_file_size_mb}MB"
        )

    if not file.content_type or "pdf" not in file.content_type.lower():
        raise BadRequestError(message="Invalid file type. Please upload a PDF.")

    # Parse canvas scale (defaults to 1.0 if not provided)
    try:
        scale = float(canvas_scale) if canvas_scale else 1.0
    except ValueError:
        scale = 1.0

    # Parse annotations
    try:
        annotations_list = json.loads(annotations)
        if not isinstance(annotations_list, list):
            raise BadRequestError(message="Annotations must be a list")
    except json.JSONDecodeError:
        raise BadRequestError(message="Invalid annotations JSON")

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.PDF_FILLER,
        operation="fill",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={
            "file_size": len(content),
            "annotations_count": len(annotations_list),
        },
    )

    # Process PDF
    pdf_service = PDFFillerService()
    filled_bytes, total_pages = await pdf_service.fill_pdf(content, annotations_list, scale)

    # Save result
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.pdf"
    filepath = os.path.join(TEMP_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(filled_bytes)

    # Complete usage tracking
    processing_time = int((time.time() - start_time) * 1000)
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=processing_time,
        output_metadata={
            "total_pages": total_pages,
            "output_size": len(filled_bytes),
            "annotations_applied": len(annotations_list),
        },
    )

    return {
        "operation": "fill",
        "total_pages": total_pages,
        "filename": "filled.pdf",
        "size": len(filled_bytes),
        "download_url": f"/api/v1/tools/pdf-filler/download/{filename}",
    }


@router.post("/fill-from-id")
async def fill_pdf_from_id(
    file_id: str = Form(...),
    annotations: str = Form(..., description="JSON array of annotations"),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Fill a previously uploaded PDF with annotations."""
    start_time = time.time()

    if not file_id or ".." in file_id or "/" in file_id:
        raise BadRequestError(message="Invalid file ID")

    filepath = os.path.join(TEMP_DIR, f"{file_id}.pdf")

    if not os.path.exists(filepath):
        raise BadRequestError(message="File not found or expired")

    with open(filepath, "rb") as f:
        content = f.read()

    # Parse annotations
    try:
        annotations_list = json.loads(annotations)
        if not isinstance(annotations_list, list):
            raise BadRequestError(message="Annotations must be a list")
    except json.JSONDecodeError:
        raise BadRequestError(message="Invalid annotations JSON")

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.PDF_FILLER,
        operation="fill_from_id",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={
            "file_size": len(content),
            "annotations_count": len(annotations_list),
        },
    )

    # Process PDF
    pdf_service = PDFFillerService()
    filled_bytes, total_pages = await pdf_service.fill_pdf(content, annotations_list)

    # Save result
    result_file_id = str(uuid.uuid4())
    result_filename = f"{result_file_id}.pdf"
    result_filepath = os.path.join(TEMP_DIR, result_filename)

    with open(result_filepath, "wb") as f:
        f.write(filled_bytes)

    # Complete usage tracking
    processing_time = int((time.time() - start_time) * 1000)
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=processing_time,
        output_metadata={
            "total_pages": total_pages,
            "output_size": len(filled_bytes),
            "annotations_applied": len(annotations_list),
        },
    )

    return {
        "operation": "fill",
        "total_pages": total_pages,
        "filename": "filled.pdf",
        "size": len(filled_bytes),
        "download_url": f"/api/v1/tools/pdf-filler/download/{result_filename}",
    }


@router.get("/download/{filename}")
async def download_filled_pdf(filename: str):
    """Download filled PDF file."""
    if not filename or ".." in filename or "/" in filename:
        raise BadRequestError(message="Invalid filename")

    filepath = os.path.join(TEMP_DIR, filename)

    if not os.path.exists(filepath):
        raise BadRequestError(message="File not found or expired")

    return FileResponse(
        filepath,
        media_type="application/pdf",
        filename="filled.pdf",
    )
