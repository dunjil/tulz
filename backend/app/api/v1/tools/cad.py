from fastapi import APIRouter, UploadFile, File, Request, Depends, BackgroundTasks
from fastapi.responses import FileResponse
from typing import Optional, List
import os
import uuid
import time
from pathlib import Path
from app.services.tools.cad_service import CADService
from app.api.deps import ClientIP, DbSession, OptionalUser, UserAgent
from app.config import settings
from app.core.exceptions import BadRequestError, FileProcessingError
from app.models.history import ToolType
from app.services.usage_service import UsageService
from app.core.rate_limiter import limiter

router = APIRouter()

TEMP_DIR = settings.temp_file_dir
os.makedirs(TEMP_DIR, exist_ok=True)

CAD_RATE_LIMIT = "10/minute"


def _output_name(original: str | None, suffix: str, ext: str) -> str:
    """Return a friendly download filename derived from the original upload name."""
    stem = Path(original).stem if original else "file"
    ext = ext.lstrip(".")
    return f"{stem}_{suffix}.{ext}" if suffix else f"{stem}.{ext}"

@router.post("/dwg-to-pdf")
@limiter.limit(CAD_RATE_LIMIT)
async def dwg_to_pdf(
    request: Request,
    file: UploadFile = File(...),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Convert DWG/DXF to PDF."""
    start_time = time.time()
    
    content = await file.read()
    if len(content) > settings.max_file_size_bytes:
        raise BadRequestError(message=f"File too large. Maximum size is {settings.max_file_size_mb}MB")

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.PDF, # CAD falls under advanced PDF tools/processing
        operation="dwg_to_pdf",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={"file_size": len(content), "filename": file.filename},
    )

    try:
        cad_service = CADService()
        pdf_bytes, pages = await cad_service.dwg_to_pdf(content, file.filename)
        
        file_id = str(uuid.uuid4())
        filename = f"{file_id}.pdf"
        filepath = os.path.join(TEMP_DIR, filename)

        with open(filepath, "wb") as f:
            f.write(pdf_bytes)

        await usage_service.complete_usage(
            history=history,
            processing_time_ms=int((time.time() - start_time) * 1000),
            output_metadata={"pages": pages, "size": len(pdf_bytes)},
        )

        out_name = _output_name(file.filename, "", "pdf")
        return {
            "operation": "dwg_to_pdf",
            "filename": out_name,
            "size": len(pdf_bytes),
            "download_url": f"/api/v1/tools/cad/download/{filename}?name={out_name}",
        }
    except Exception as e:
        raise FileProcessingError(message=f"CAD conversion failed: {str(e)}")

@router.post("/pdf-to-dwg")
@limiter.limit(CAD_RATE_LIMIT)
async def pdf_to_dwg(
    request: Request,
    file: UploadFile = File(...),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Convert PDF to DXF (DWG compatible)."""
    start_time = time.time()
    
    content = await file.read()
    if len(content) > settings.max_file_size_bytes:
        raise BadRequestError(message=f"File too large. Maximum size is {settings.max_file_size_mb}MB")

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.PDF,
        operation="pdf_to_dwg",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={"file_size": len(content)},
    )

    try:
        cad_service = CADService()
        dwg_bytes, pages = await cad_service.pdf_to_dwg(content)
        
        file_id = str(uuid.uuid4())
        filename = f"{file_id}.dwg"
        filepath = os.path.join(TEMP_DIR, filename)

        with open(filepath, "wb") as f:
            f.write(dwg_bytes)

        await usage_service.complete_usage(
            history=history,
            processing_time_ms=int((time.time() - start_time) * 1000),
            output_metadata={"pages": pages, "size": len(dwg_bytes)},
        )

        out_name = _output_name(file.filename, "", "dwg")
        return {
            "operation": "pdf_to_dwg",
            "filename": out_name,
            "size": len(dwg_bytes),
            "download_url": f"/api/v1/tools/cad/download/{filename}?name={out_name}",
        }
    except Exception as e:
        raise FileProcessingError(message=f"PDF to CAD conversion failed: {str(e)}")

@router.get("/download/{filename}")
async def download_cad(filename: str, name: Optional[str] = None):
    """Download processed CAD or PDF file."""
    if not filename or ".." in filename or "/" in filename:
        raise BadRequestError(message="Invalid filename")

    filepath = os.path.join(TEMP_DIR, filename)
    if not os.path.exists(filepath):
        raise BadRequestError(message="File not found or expired")

    download_name = name if name else filename

    if filename.endswith(".pdf"):
        media_type = "application/pdf"
    elif filename.endswith(".dwg"):
        media_type = "application/acad"
    else:
        media_type = "application/dxf"

    return FileResponse(
        filepath,
        media_type=media_type,
        filename=download_name,
    )
