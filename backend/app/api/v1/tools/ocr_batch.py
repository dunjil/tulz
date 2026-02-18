"""Batch OCR processing endpoints.

Allows Pro users to process multiple files at once.
"""

import os
import time
import uuid
from typing import List

from fastapi import APIRouter, File, Form, UploadFile

from app.api.deps import ClientIP, DbSession, OptionalUser, UserAgent
from app.config import settings
from app.core.exceptions import BadRequestError
from app.core.rate_limiter import limiter, TOOL_RATE_LIMIT_PRO
from app.models.history import ToolType
from app.services.usage_service import UsageService
from app.workers.tasks.ocr_tasks import extract_text_from_image_task

router = APIRouter()

# Temp file storage
TEMP_DIR = settings.temp_file_dir
os.makedirs(TEMP_DIR, exist_ok=True)

# Allowed file types
ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/bmp", "image/tiff"}


@router.post("/batch/image-to-text")
@limiter.limit(TOOL_RATE_LIMIT_PRO)
async def batch_image_to_text(
    request,
    files: List[UploadFile] = File(...),
    language: str = Form("eng"),
    use_preprocessing: bool = Form(True),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Process multiple images at once (Pro tier only).
    
    Supports: PNG, JPEG, WebP, BMP, TIFF
    
    LIMITATIONS:
    - Pro tier only
    - Maximum 10 files per batch
    - Each file must be under 10MB
    - All files processed with same language
    
    Returns:
        Batch ID and list of task IDs for tracking
    """
    start_time = time.time()
    
    # Check user tier
    usage_service = UsageService(session)
    remaining = await usage_service.get_remaining_uses(user=user, ip_address=client_ip)
    tier = remaining.get("tier", "free")
    
    if tier != "pro" and not remaining.get("is_unlimited"):
        raise BadRequestError(
            message="Batch processing requires Pro tier. Upgrade to process multiple files at once."
        )
    
    # Validate batch size
    if len(files) > 10:
        raise BadRequestError(message="Maximum 10 files per batch")
    
    if len(files) == 0:
        raise BadRequestError(message="No files provided")
    
    # Validate all files and save to temp
    batch_id = uuid.uuid4().hex
    temp_files = []
    
    for i, file in enumerate(files):
        # Validate file type
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            raise BadRequestError(
                message=f"File {i+1} ({file.filename}): Invalid type. Supported: PNG, JPEG, WebP, BMP, TIFF"
            )
        
        # Read and validate size
        content = await file.read()
        file_size_mb = len(content) / (1024 * 1024)
        
        if file_size_mb > 10:
            raise BadRequestError(
                message=f"File {i+1} ({file.filename}): Too large. Maximum 10MB per file"
            )
        
        # Save to temp file
        temp_filename = f"batch_{batch_id}_{i}_{uuid.uuid4().hex[:8]}.tmp"
        temp_path = os.path.join(TEMP_DIR, temp_filename)
        
        with open(temp_path, "wb") as f:
            f.write(content)
        
        temp_files.append({
            "original_filename": file.filename,
            "temp_path": temp_path,
            "size": len(content),
        })
    
    # Queue Celery tasks for each file
    tasks = []
    for i, file_info in enumerate(temp_files):
        # Record usage for each file
        history, _ = await usage_service.check_and_record_usage(
            tool=ToolType.OCR,
            operation="batch_image_to_text",
            user=user,
            ip_address=client_ip,
            user_agent=user_agent,
            input_metadata={
                "batch_id": batch_id,
                "filename": file_info["original_filename"],
                "size": file_info["size"],
                "language": language,
                "preprocessing": use_preprocessing,
                "batch_position": i + 1,
                "batch_total": len(temp_files),
            },
        )
        
        # Queue Celery task
        task = extract_text_from_image_task.delay(
            image_path=file_info["temp_path"],
            language=language,
            output_dir=TEMP_DIR,
        )
        
        tasks.append({
            "filename": file_info["original_filename"],
            "task_id": task.id,
            "history_id": history.id,
        })
    
    processing_time = int((time.time() - start_time) * 1000)
    
    return {
        "success": True,
        "batch_id": batch_id,
        "total_files": len(files),
        "tasks": tasks,
        "language": language,
        "preprocessing": use_preprocessing,
        "processing_time_ms": processing_time,
        "message": f"Batch processing started for {len(files)} files. Use task IDs to check status.",
    }


@router.get("/batch/status/{task_id}")
async def get_batch_task_status(
    task_id: str,
    user: OptionalUser = None,
):
    """Get status of a batch OCR task.
    
    Returns:
        Task status and result if completed
    """
    from celery.result import AsyncResult
    from app.workers.celery_app import celery_app
    
    task = AsyncResult(task_id, app=celery_app)
    
    if task.ready():
        if task.successful():
            result = task.result
            return {
                "status": "completed",
                "result": result,
            }
        else:
            return {
                "status": "failed",
                "error": str(task.info),
            }
    else:
        return {
            "status": "processing",
            "progress": task.info if isinstance(task.info, dict) else None,
        }
