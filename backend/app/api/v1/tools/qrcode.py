"""QR Code generation endpoints."""

import time
from fastapi import APIRouter
from fastapi.responses import Response

from app.api.deps import ClientIP, DbSession, OptionalUser, UserAgent
from app.models.history import ToolType
from app.schemas.tools import QRCodeRequest, QRCodeResponse
from app.services.tools.qrcode_service import QRCodeService
from app.services.usage_service import UsageService

router = APIRouter()


@router.post("/generate", response_model=QRCodeResponse)
async def generate_qrcode(
    data: QRCodeRequest,
    session: DbSession,
    user: OptionalUser,
    client_ip: ClientIP,
    user_agent: UserAgent,
):
    """Generate a QR code."""
    start_time = time.time()

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.QRCODE,
        operation="generate",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={
            "content_type": data.content_type.value,
            "size": data.size,
            "format": data.format.value,
        },
    )

    # Generate QR code
    qr_service = QRCodeService()
    result = qr_service.generate(data)

    # Complete usage tracking
    processing_time = int((time.time() - start_time) * 1000)
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=processing_time,
        output_metadata={
            "format": data.format.value,
            "size": data.size,
        },
    )

    return QRCodeResponse(
        image_base64=result,
        format=data.format,
        size=data.size,
        content_type=data.content_type,
    )


@router.post("/generate/download")
async def generate_qrcode_download(
    data: QRCodeRequest,
    session: DbSession,
    user: OptionalUser,
    client_ip: ClientIP,
    user_agent: UserAgent,
):
    """Generate and download QR code as file."""
    start_time = time.time()

    # Check and record usage
    usage_service = UsageService(session)
    history, tier = await usage_service.check_and_record_usage(
        tool=ToolType.QRCODE,
        operation="generate_download",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
    )

    # Generate QR code
    qr_service = QRCodeService()
    image_bytes = qr_service.generate_bytes(data)

    # Complete usage tracking
    processing_time = int((time.time() - start_time) * 1000)
    await usage_service.complete_usage(
        history=history,
        processing_time_ms=processing_time,
        output_metadata={
            "format": data.format.value,
            "size": len(image_bytes),
        },
    )

    # Determine content type and filename
    if data.format.value == "svg":
        media_type = "image/svg+xml"
        filename = "qrcode.svg"
    else:
        media_type = "image/png"
        filename = "qrcode.png"

    return Response(
        content=image_bytes,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
