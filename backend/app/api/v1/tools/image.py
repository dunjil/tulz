"""Image processing endpoints."""

import io
import os
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from PIL import Image

from fastapi import APIRouter, File, Form, Request, UploadFile
from fastapi.responses import FileResponse

from app.api.deps import ClientIP, DbSession, OptionalUser, UserAgent
from app.config import settings
from app.core.exceptions import BadRequestError
from app.core.file_validation import validate_image_file
from app.core.rate_limiter import limiter, IMAGE_RATE_LIMIT, IMAGE_BATCH_RATE_LIMIT
from app.models.history import ToolType
from app.schemas.tools import ImageFormat, ImageOperation, ImageRequest, ImageResponse
from app.services.tools.image_service import ImageService
from app.services.usage_service import UsageService

router = APIRouter()

# Temp file storage
TEMP_DIR = settings.temp_file_dir
os.makedirs(TEMP_DIR, exist_ok=True)


@router.post("/process", response_model=ImageResponse)
@limiter.limit(IMAGE_RATE_LIMIT)
async def process_image(
    request: Request,  # Required for rate limiter
    file: UploadFile = File(...),
    operation: ImageOperation = Form(...),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
    # Crop parameters
    crop_x: Optional[int] = Form(None),
    crop_y: Optional[int] = Form(None),
    crop_width: Optional[int] = Form(None),
    crop_height: Optional[int] = Form(None),
    # Resize parameters
    resize_width: Optional[int] = Form(None),
    resize_height: Optional[int] = Form(None),
    maintain_aspect: bool = Form(True),
    scale_percent: Optional[int] = Form(None),
    # Format and quality
    output_format: ImageFormat = Form(ImageFormat.PNG),
    quality: int = Form(85),
    # Rotate and flip
    rotation_angle: Optional[int] = Form(None),
    flip_direction: Optional[str] = Form(None),
    # Filters and effects
    filter_type: Optional[str] = Form(None),
    blur_radius: int = Form(5),
    # Color adjustments
    brightness: Optional[float] = Form(None),
    contrast: Optional[float] = Form(None),
    saturation: Optional[float] = Form(None),
    # Creative effects
    pixelate_size: int = Form(10),
    corner_radius: int = Form(20),
    mirror_direction: Optional[str] = Form(None),
    # Watermark
    watermark_text: Optional[str] = Form(None),
    watermark_opacity: float = Form(0.5),
    watermark_position: str = Form("bottom_right"),
    watermark_size: int = Form(20),
    # Frame/border
    border_width: int = Form(10),
    border_color: str = Form("#FFFFFF"),
    # Thumbnail
    thumbnail_width: int = Form(200),
    thumbnail_height: int = Form(200),
    # Upscale
    upscale_factor: int = Form(2),
):
    """Process an image (crop, resize, convert, compress, remove background)."""
    start_time = time.time()

    # Validate file size
    content = await file.read()
    if len(content) > settings.max_file_size_bytes:
        raise BadRequestError(
            message=f"File too large. Maximum size is {settings.max_file_size_mb}MB"
        )

    # SECURITY: Validate file using magic bytes, not just Content-Type header
    is_valid, detected_type = validate_image_file(content, file.content_type)
    if not is_valid:
        raise BadRequestError(message=f"Invalid file type. {detected_type}")

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.IMAGE,
        operation=operation.value,
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={
            "operation": operation.value,
            "file_size": len(content),
            "content_type": file.content_type,
        },
    )

    # Build request object
    img_request = ImageRequest(
        operation=operation,
        crop_x=crop_x,
        crop_y=crop_y,
        crop_width=crop_width,
        crop_height=crop_height,
        resize_width=resize_width,
        resize_height=resize_height,
        maintain_aspect=maintain_aspect,
        scale_percent=scale_percent,
        output_format=output_format,
        quality=quality,
        rotation_angle=rotation_angle,
        flip_direction=flip_direction,
        filter_type=filter_type,
        blur_radius=blur_radius,
        brightness=brightness,
        contrast=contrast,
        saturation=saturation,
        pixelate_size=pixelate_size,
        corner_radius=corner_radius,
        mirror_direction=mirror_direction,
        watermark_text=watermark_text,
        watermark_opacity=watermark_opacity,
        watermark_position=watermark_position,
        watermark_size=watermark_size,
        border_width=border_width,
        border_color=border_color,
        thumbnail_width=thumbnail_width,
        thumbnail_height=thumbnail_height,
        upscale_factor=upscale_factor,
    )

    # Process image
    image_service = ImageService()
    result_bytes, original_size, new_size = await image_service.process(
        content, img_request
    )

    # Save to temp file
    file_id = str(uuid.uuid4())
    ext = output_format.value
    if output_format == ImageFormat.JPEG:
        ext = "jpg"
    filename = f"{file_id}.{ext}"
    filepath = os.path.join(TEMP_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(result_bytes)

    # Complete usage tracking
    processing_time = int((time.time() - start_time) * 1000)
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=processing_time,
        output_metadata={
            "format": output_format.value,
            "original_size": original_size,
            "new_size": new_size,
            "file_size": len(result_bytes),
        },
    )

    return ImageResponse(
        operation=operation,
        original_size=original_size,
        new_size=new_size,
        format=output_format.value,
        file_size_bytes=len(result_bytes),
        download_url=f"/api/v1/tools/image/download/{filename}",
    )


@router.get("/download/{filename}")
async def download_image(filename: str):
    """Download processed image."""
    # Validate filename
    if not filename or ".." in filename or "/" in filename:
        raise BadRequestError(message="Invalid filename")

    filepath = os.path.join(TEMP_DIR, filename)

    if not os.path.exists(filepath):
        raise BadRequestError(message="File not found or expired")

    # Determine media type
    ext = filename.split(".")[-1].lower()
    media_types = {
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "webp": "image/webp",
        "pdf": "application/pdf",
    }
    media_type = media_types.get(ext, "application/octet-stream")

    return FileResponse(
        filepath,
        media_type=media_type,
        filename=filename,
    )


@router.post("/ocr")
@limiter.limit(IMAGE_RATE_LIMIT)
async def extract_text_ocr(
    request: Request,
    file: UploadFile = File(...),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Extract text from image using OCR."""
    # Validate file
    content = await file.read()
    if len(content) > settings.max_file_size_bytes:
        raise BadRequestError(message=f"File too large. Maximum size is {settings.max_file_size_mb}MB")

    is_valid, detected_type = validate_image_file(content, file.content_type)
    if not is_valid:
        raise BadRequestError(message=f"Invalid file type. {detected_type}")

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.IMAGE,
        operation="ocr",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={"file_size": len(content)},
    )

    # Perform OCR
    image_service = ImageService()
    text = image_service.perform_ocr(content)

    # Complete usage tracking
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=100,
        output_metadata={"text_length": len(text)},
    )

    return {"text": text, "length": len(text)}


@router.post("/color-palette")
@limiter.limit(IMAGE_RATE_LIMIT)
async def extract_color_palette(
    request: Request,
    file: UploadFile = File(...),
    num_colors: int = Form(5),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Extract dominant color palette from image."""
    # Validate file
    content = await file.read()
    if len(content) > settings.max_file_size_bytes:
        raise BadRequestError(message=f"File too large. Maximum size is {settings.max_file_size_mb}MB")

    is_valid, detected_type = validate_image_file(content, file.content_type)
    if not is_valid:
        raise BadRequestError(message=f"Invalid file type. {detected_type}")

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.IMAGE,
        operation="color_palette",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={"file_size": len(content)},
    )

    # Extract colors
    image_service = ImageService()
    img = Image.open(io.BytesIO(content))
    colors = image_service.extract_color_palette(img, num_colors)

    # Convert to hex
    hex_colors = [f"#{r:02x}{g:02x}{b:02x}" for r, g, b in colors]

    # Complete usage tracking
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=50,
        output_metadata={"num_colors": len(hex_colors)},
    )

    return {"colors": hex_colors}


@router.post("/batch")
@limiter.limit(IMAGE_BATCH_RATE_LIMIT)
async def batch_process_images(
    request: Request,  # Required for rate limiter
    files: list[UploadFile] = File(...),
    operation: ImageOperation = Form(...),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
    output_format: ImageFormat = Form(ImageFormat.PNG),
    quality: int = Form(85),
):
    """Batch process multiple images (premium feature)."""
    # Check tier - batch processing is premium only
    usage_service = UsageService(session)
    remaining = await usage_service.get_remaining_uses(user=user, ip_address=client_ip)

    if remaining.get("tier") != "pro":
        raise BadRequestError(
            message="Batch processing is a Pro feature. Please upgrade your plan."
        )

    if len(files) > 10:
        raise BadRequestError(message="Maximum 10 files per batch")

    results = []

    for file in files:
        content = await file.read()

        if len(content) > settings.max_file_size_bytes:
            results.append({
                "filename": file.filename,
                "success": False,
                "error": "File too large",
            })
            continue

        # SECURITY: Validate file using magic bytes
        is_valid, detected_type = validate_image_file(content, file.content_type)
        if not is_valid:
            results.append({
                "filename": file.filename,
                "success": False,
                "error": f"Invalid image file: {detected_type}",
            })
            continue

        try:
            request = ImageRequest(
                operation=operation,
                output_format=output_format,
                quality=quality,
            )

            image_service = ImageService()
            result_bytes, original_size, new_size = await image_service.process(
                content, request
            )

            # Save file
            file_id = str(uuid.uuid4())
            ext = output_format.value
            filename = f"{file_id}.{ext}"
            filepath = os.path.join(TEMP_DIR, filename)

            with open(filepath, "wb") as f:
                f.write(result_bytes)

            results.append({
                "filename": file.filename,
                "success": True,
                "download_url": f"/api/v1/tools/image/download/{filename}",
                "original_size": original_size,
                "new_size": new_size,
            })

        except Exception as e:
            results.append({
                "filename": file.filename,
                "success": False,
                "error": str(e),
            })

    # Record single usage for batch
    await usage_service.check_and_record_usage(
        tool=ToolType.IMAGE,
        operation=f"batch_{operation.value}",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={"file_count": len(files)},
    )

    return {"results": results}
