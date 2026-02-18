"""Excel to CSV conversion endpoints.

NOTE: Excel to CSV is a FREE tool for all users - no usage limits applied.
Usage is tracked for analytics purposes only.
"""

import os
import time
import uuid
import zipfile
from io import BytesIO

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import FileResponse, Response

from app.api.deps import ClientIP, DbSession, OptionalUser, UserAgent
from app.config import settings
from app.core.exceptions import BadRequestError
from app.models.history import ToolType
from app.schemas.tools import ExcelResponse
from app.services.tools.excel_service import ExcelService
from app.services.usage_service import UsageService

router = APIRouter()

TEMP_DIR = settings.temp_file_dir
os.makedirs(TEMP_DIR, exist_ok=True)


@router.post("/to-csv", response_model=ExcelResponse)
async def excel_to_csv(
    file: UploadFile = File(...),
    sheets: str = Form(None, description="Comma-separated sheet names (empty = all)"),
    preserve_formulas: bool = Form(False),
    clean_data: bool = Form(True),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Convert Excel file to CSV (one CSV per sheet).

    NOTE: This is a FREE tool - usage tracked for analytics only.
    """
    start_time = time.time()
    content = await file.read()

    if len(content) > settings.max_file_size_bytes:
        raise BadRequestError(message=f"File too large. Maximum size is {settings.max_file_size_mb}MB")

    # Validate file type
    valid_types = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
    ]
    if file.content_type and file.content_type not in valid_types:
        # Also check file extension
        if not file.filename or not (
            file.filename.endswith(".xlsx") or file.filename.endswith(".xls")
        ):
            raise BadRequestError(message="Invalid file type. Please upload an Excel file.")

    # Parse sheet names
    sheet_list = None
    if sheets:
        sheet_list = [s.strip() for s in sheets.split(",") if s.strip()]

    # Convert Excel to CSV
    excel_service = ExcelService()
    csv_results = await excel_service.to_csv(
        content,
        sheets=sheet_list,
        preserve_formulas=preserve_formulas,
        clean_data=clean_data,
    )

    # Save result files
    saved_files = []
    total_size = 0

    for sheet_name, csv_bytes, row_count, col_count in csv_results:
        file_id = str(uuid.uuid4())
        filename = f"{file_id}.csv"
        filepath = os.path.join(TEMP_DIR, filename)

        with open(filepath, "wb") as f:
            f.write(csv_bytes)

        saved_files.append({
            "sheet_name": sheet_name,
            "rows": row_count,
            "columns": col_count,
            "size": len(csv_bytes),
            "download_url": f"/api/v1/tools/excel/download/{filename}",
        })
        total_size += len(csv_bytes)

    # Track usage for analytics
    processing_time = int((time.time() - start_time) * 1000)
    usage_service = UsageService(session)
    await usage_service.record_usage_analytics_only(
        tool=ToolType.EXCEL,
        operation="to_csv",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={
            "file_size": len(content),
            "filename": file.filename,
        },
        output_metadata={
            "sheets_count": len(csv_results),
            "total_size": total_size,
        },
        processing_time_ms=processing_time,
    )

    return ExcelResponse(
        operation="to_csv",
        sheet_count=len(csv_results),
        sheets_processed=[r[0] for r in csv_results],
        result_files=saved_files,
        total_size_bytes=total_size,
    )


@router.post("/to-csv/zip")
async def excel_to_csv_zip(
    file: UploadFile = File(...),
    sheets: str = Form(None),
    preserve_formulas: bool = Form(False),
    clean_data: bool = Form(True),
):
    """Convert Excel file to CSV and return as ZIP archive.

    NOTE: This is a FREE tool - no usage limits or tracking.
    """
    content = await file.read()

    if len(content) > settings.max_file_size_bytes:
        raise BadRequestError(message=f"File too large. Maximum size is {settings.max_file_size_mb}MB")

    # Parse sheet names
    sheet_list = None
    if sheets:
        sheet_list = [s.strip() for s in sheets.split(",") if s.strip()]

    # Convert Excel to CSV
    excel_service = ExcelService()
    csv_results = await excel_service.to_csv(
        content,
        sheets=sheet_list,
        preserve_formulas=preserve_formulas,
        clean_data=clean_data,
    )

    # Create ZIP archive
    zip_buffer = BytesIO()

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for sheet_name, csv_bytes, _, _ in csv_results:
            # Sanitize filename
            safe_name = "".join(c if c.isalnum() or c in " -_" else "_" for c in sheet_name)
            zip_file.writestr(f"{safe_name}.csv", csv_bytes)

    zip_bytes = zip_buffer.getvalue()

    # Get original filename without extension
    base_name = os.path.splitext(file.filename or "excel")[0]

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{base_name}_csv.zip"'},
    )


@router.get("/download/{filename}")
async def download_csv(filename: str):
    """Download converted CSV file."""
    if not filename or ".." in filename or "/" in filename:
        raise BadRequestError(message="Invalid filename")

    filepath = os.path.join(TEMP_DIR, filename)

    if not os.path.exists(filepath):
        raise BadRequestError(message="File not found or expired")

    return FileResponse(
        filepath,
        media_type="text/csv",
        filename=filename,
    )


@router.post("/info")
async def get_excel_info(file: UploadFile = File(...)):
    """Get information about an Excel file (sheets, row counts)."""
    content = await file.read()

    if len(content) > settings.max_file_size_bytes:
        raise BadRequestError(message=f"File too large. Maximum size is {settings.max_file_size_mb}MB")

    excel_service = ExcelService()
    info = await excel_service.get_info(content)

    return info


@router.post("/from-csv")
async def csv_to_excel(
    file: UploadFile = File(...),
    sheet_name: str = Form("Sheet1"),
    delimiter: str = Form(","),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """Convert CSV file to Excel.

    NOTE: This is a FREE tool - usage tracked for analytics only.
    """
    start_time = time.time()
    content = await file.read()

    if len(content) > settings.max_file_size_bytes:
        raise BadRequestError(message=f"File too large. Maximum size is {settings.max_file_size_mb}MB")

    # Validate file type
    if file.filename and not file.filename.lower().endswith(".csv"):
        raise BadRequestError(message="Invalid file type. Please upload a CSV file.")

    # Convert CSV to Excel
    excel_service = ExcelService()
    excel_bytes, row_count, col_count = await excel_service.csv_to_excel(
        content,
        sheet_name=sheet_name,
        delimiter=delimiter,
    )

    # Save result file
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.xlsx"
    filepath = os.path.join(TEMP_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(excel_bytes)

    # Track usage for analytics
    processing_time = int((time.time() - start_time) * 1000)
    usage_service = UsageService(session)
    await usage_service.record_usage_analytics_only(
        tool=ToolType.EXCEL,
        operation="from_csv",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={
            "file_size": len(content),
            "filename": file.filename,
        },
        output_metadata={
            "rows": row_count,
            "columns": col_count,
            "output_size": len(excel_bytes),
        },
        processing_time_ms=processing_time,
    )

    # Get original filename without extension
    base_name = os.path.splitext(file.filename or "data")[0]

    return {
        "success": True,
        "operation": "from_csv",
        "rows": row_count,
        "columns": col_count,
        "size": len(excel_bytes),
        "download_url": f"/api/v1/tools/excel/download-xlsx/{filename}",
        "filename": f"{base_name}.xlsx",
    }


@router.get("/download-xlsx/{filename}")
async def download_xlsx(filename: str):
    """Download converted Excel file."""
    if not filename or ".." in filename or "/" in filename:
        raise BadRequestError(message="Invalid filename")

    filepath = os.path.join(TEMP_DIR, filename)

    if not os.path.exists(filepath):
        raise BadRequestError(message="File not found or expired")

    return FileResponse(
        filepath,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=filename,
    )
