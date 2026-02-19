"""Website to PDF conversion endpoints."""

import os
import time
import uuid
from typing import Optional

from fastapi import APIRouter, Form
from fastapi.responses import FileResponse
from pydantic import HttpUrl

from app.api.deps import ClientIP, DbSession, OptionalUser, UserAgent
from app.config import settings
from app.core.exceptions import BadRequestError, UsageLimitError
from app.models.history import ToolType
from app.services.tools.webpdf_service import WebPdfService
from app.services.usage_service import UsageService

router = APIRouter()

# Temp file storage
TEMP_DIR = settings.temp_file_dir
os.makedirs(TEMP_DIR, exist_ok=True)

# Tier limits
TIER_LIMITS = {
    "free": {
        "max_pages": 5,
        "wait_time": 3000,  # 3 seconds
        "include_background": False,
        "custom_headers": False,
        "pdf_format": "A4",
    },
    "pro": {
        "max_pages": 100,
        "wait_time": 15000,
        "include_background": True,
        "custom_headers": True,
        "pdf_format": "any",
    },
}


@router.post("/convert")
async def convert_website_to_pdf(
    url: str = Form(...),
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
    # Options
    format: str = Form("A4"),
    landscape: bool = Form(False),
    include_background: bool = Form(True),
    scale: float = Form(1.0),
    margin_top: str = Form("10mm"),
    margin_bottom: str = Form("10mm"),
    margin_left: str = Form("10mm"),
    margin_right: str = Form("10mm"),
    wait_for: int = Form(1000),  # Reduced from 3000 for faster conversion
    full_page: bool = Form(True),
    viewport_type: str = Form("desktop"),
):
    """Convert a website URL to PDF."""
    start_time = time.time()

    # Validate URL
    if not url.startswith(("http://", "https://")):
        url = f"https://{url}"

    # Check for blocked domains (security)
    blocked_domains = ["localhost", "127.0.0.1", "0.0.0.0", "internal", "10.", "192.168.", "172."]
    for blocked in blocked_domains:
        if blocked in url.lower():
            raise BadRequestError(message="This URL is not allowed for security reasons")

    try:
        # Check and record usage
        usage_service = UsageService(session)
        history, tier = await usage_service.check_and_record_usage(
            tool=ToolType.WEBPDF,
            operation="convert",
            user=user,
            ip_address=client_ip,
            user_agent=user_agent,
            input_metadata={
                "url": url,
                "format": format,
                "landscape": landscape,
            },
        )

        # Apply tier limits
        limits = TIER_LIMITS.get(tier, TIER_LIMITS["free"])

        # Enforce limits based on tier
        if tier == "free":
            include_background = False
            wait_for = min(wait_for, limits["wait_time"])
            format = "A4"  # Force A4 for free tier

        # Validate scale
        if scale < 0.1 or scale > 2.0:
            scale = 1.0

        # Convert website to PDF
        webpdf_service = WebPdfService()
        pdf_bytes, page_count, title = await webpdf_service.convert(
            url=url,
            format=format,
            landscape=landscape,
            include_background=include_background,
            scale=scale,
            margin_top=margin_top,
            margin_bottom=margin_bottom,
            margin_left=margin_left,
            margin_right=margin_right,
            wait_for=wait_for,
            full_page=full_page,
            viewport_type=viewport_type,
        )

        # Check page limit for tier
        if page_count > limits["max_pages"]:
            raise UsageLimitError(
                message=f"PDF has {page_count} pages. Your {tier} tier allows up to {limits['max_pages']} pages. Please upgrade for more.",
                details={"page_count": page_count, "limit": limits["max_pages"]},
            )

        # Save to temp file
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
            output_metadata={
                "page_count": page_count,
                "file_size": len(pdf_bytes),
                "title": title,
            },
        )

        return {
            "success": True,
            "url": url,
            "title": title or "Untitled",
            "page_count": page_count,
            "file_size_bytes": len(pdf_bytes),
            "download_url": f"/api/v1/tools/webpdf/download/{filename}",
            "preview_url": f"/api/v1/tools/webpdf/preview/{filename}",
            "tier": tier,
            "limits": {
                "max_pages": limits["max_pages"],
                "features": {
                    "background": limits["include_background"],
                    "custom_format": limits["pdf_format"] == "any",
                },
            },
        }
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"[WEB-PDF FATAL ERROR] {str(e)}\n{error_details}")
        
        # If it's already one of our custom exceptions, re-raise it
        from app.core.exceptions import ToolHubException
        if isinstance(e, ToolHubException):
            raise e
            
        raise BadRequestError(message=f"Deployment or service error: {str(e)}")


@router.get("/download/{filename}")
async def download_pdf(filename: str):
    """Download converted PDF."""
    # Validate filename
    if not filename or ".." in filename or "/" in filename:
        raise BadRequestError(message="Invalid filename")

    if not filename.endswith(".pdf"):
        raise BadRequestError(message="Invalid file type")

    filepath = os.path.join(TEMP_DIR, filename)

    if not os.path.exists(filepath):
        raise BadRequestError(message="File not found or expired")

    return FileResponse(
        filepath,
        media_type="application/pdf",
        filename=f"website.pdf",
    )


@router.get("/preview/{filename}")
async def preview_pdf(filename: str):
    """Preview PDF inline (no download prompt)."""
    # Validate filename
    if not filename or ".." in filename or "/" in filename:
        raise BadRequestError(message="Invalid filename")

    if not filename.endswith(".pdf"):
        raise BadRequestError(message="Invalid file type")

    filepath = os.path.join(TEMP_DIR, filename)

    if not os.path.exists(filepath):
        raise BadRequestError(message="File not found or expired")

    # Serve inline for preview (no Content-Disposition: attachment)
    return FileResponse(
        filepath,
        media_type="application/pdf",
        headers={"Content-Disposition": "inline"},
    )


@router.get("/limits")
async def get_tier_limits(
    user: OptionalUser = None,
    session: DbSession = None,
    client_ip: ClientIP = None,
):
    """Get conversion limits for current user's tier."""
    usage_service = UsageService(session)
    remaining = await usage_service.get_remaining_uses(user=user, ip_address=client_ip)
    tier = remaining.get("tier", "free")

    return {
        "tier": tier,
        "limits": TIER_LIMITS.get(tier, TIER_LIMITS["free"]),
        "all_tiers": TIER_LIMITS,
    }
