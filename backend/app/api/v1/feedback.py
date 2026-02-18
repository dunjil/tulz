"""Feedback API endpoints for reviews and suggestions."""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import (
    AdminUser,
    ClientIP,
    DbSession,
    OptionalUser,
    UserAgent,
)
from app.models.feedback import (
    Feedback,
    FeedbackCreate,
    FeedbackResponse,
    FeedbackStatus,
    FeedbackType,
    FeedbackUpdate,
)
from app.models.user import User

router = APIRouter()


@router.post("/submit", response_model=FeedbackResponse)
async def submit_feedback(
    data: FeedbackCreate,
    session: DbSession,
    user: OptionalUser,
    ip_address: ClientIP,
    user_agent: UserAgent,
):
    """
    Submit feedback (review, suggestion, bug report, or feature request).

    Works for both registered users and anonymous guests.
    """
    # Validate rating for reviews
    if data.type == FeedbackType.REVIEW and data.rating is None:
        data.rating = 5  # Default to 5 stars if not provided

    # Create feedback
    feedback = Feedback(
        type=data.type,
        subject=data.subject,
        message=data.message,
        rating=data.rating,
        tool_name=data.tool_name,
        user_id=user.id if user else None,
        guest_email=data.guest_email if not user else None,
        guest_name=data.guest_name if not user else None,
        ip_address=ip_address,
        user_agent=user_agent[:500] if user_agent else None,
    )

    session.add(feedback)
    await session.commit()
    await session.refresh(feedback)

    return FeedbackResponse(
        id=feedback.id,
        type=feedback.type,
        subject=feedback.subject,
        message=feedback.message,
        rating=feedback.rating,
        tool_name=feedback.tool_name,
        status=feedback.status,
        admin_notes=feedback.admin_notes,
        user_id=feedback.user_id,
        guest_email=feedback.guest_email,
        guest_name=feedback.guest_name,
        created_at=feedback.created_at,
    )


@router.get("/types")
async def get_feedback_types():
    """Get available feedback types."""
    return {
        "types": [
            {"id": "review", "name": "Review", "description": "Share your experience with Tulz"},
            {"id": "suggestion", "name": "Suggestion", "description": "Suggest improvements or new features"},
            {"id": "bug_report", "name": "Bug Report", "description": "Report a problem or issue"},
            {"id": "feature_request", "name": "Feature Request", "description": "Request a new tool or feature"},
        ]
    }


@router.get("/tools")
async def get_tool_names():
    """Get list of tools for feedback."""
    return {
        "tools": [
            {"id": "qrcode", "name": "QR Code Generator"},
            {"id": "calculator", "name": "Scientific Calculator"},
            {"id": "image", "name": "Image Editor (All-in-One)"},
            {"id": "image-compress", "name": "Image Compressor"},
            {"id": "image-resize", "name": "Image Resizer"},
            {"id": "image-convert", "name": "Image Converter"},
            {"id": "image-crop", "name": "Image Cropper"},
            {"id": "image-background-remover", "name": "Background Remover"},
            {"id": "image-rotate", "name": "Image Rotator"},
            {"id": "image-to-kb", "name": "Image to KB"},
            {"id": "image-watermark", "name": "Add Watermark (Image)"},
            {"id": "webp-converter", "name": "WebP Converter"},
            {"id": "webp-to-png", "name": "WebP to PNG"},
            {"id": "webp-to-jpg", "name": "WebP to JPG"},
            {"id": "png-to-jpg", "name": "PNG to JPG"},
            {"id": "jpg-to-png", "name": "JPG to PNG"},
            {"id": "heic-to-jpg", "name": "HEIC to JPG"},
            {"id": "instagram-resizer", "name": "Instagram Resizer"},
            {"id": "whatsapp-dp-resizer", "name": "WhatsApp DP Resizer"},
            {"id": "twitter-header-resizer", "name": "Twitter Header Resizer"},
            {"id": "linkedin-banner-resizer", "name": "LinkedIn Banner Resizer"},
            {"id": "pdf-split", "name": "Split PDF"},
            {"id": "pdf-merge", "name": "Merge PDFs"},
            {"id": "pdf-compress", "name": "Compress PDF"},
            {"id": "pdf-to-word", "name": "PDF to Word"},
            {"id": "pdf-remove-watermark", "name": "Remove Watermark"},
            {"id": "pdf-to-jpg", "name": "PDF to JPG"},
            {"id": "jpg-to-pdf", "name": "JPG to PDF"},
            {"id": "pdf-rotate", "name": "Rotate PDF"},
            {"id": "pdf-unlock", "name": "Unlock PDF"},
            {"id": "pdf-protect", "name": "Protect PDF"},
            {"id": "html-to-pdf", "name": "HTML to PDF"},
            {"id": "word-to-pdf", "name": "Word to PDF"},
            {"id": "pdf-add-watermark", "name": "Add Watermark (PDF)"},
            {"id": "pdf-page-numbers", "name": "Add Page Numbers"},
            {"id": "pdf-organize", "name": "Organize PDF"},
            {"id": "pdf-crop", "name": "Crop PDF"},
            {"id": "excel-to-pdf", "name": "Excel to PDF"},
            {"id": "powerpoint-to-pdf", "name": "PowerPoint to PDF"},
            {"id": "pdf-filler", "name": "PDF Filler"},
            {"id": "ocr", "name": "OCR"},
            {"id": "json", "name": "JSON Formatter"},
            {"id": "markdown", "name": "Markdown to PDF"},
            {"id": "diff", "name": "Text Diff"},
            {"id": "invoice", "name": "Invoice Generator"},
            {"id": "cv", "name": "CV Generator"},
            {"id": "general", "name": "General / Platform"},
        ]
    }


@router.get("/list")
async def list_public_feedback(
    session: DbSession,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """
    List public feedback (reviews and suggestions).

    Accessible to all users. Sanitized to protect privacy.
    """
    # Build query
    query = select(Feedback).order_by(Feedback.created_at.desc())

    # Get total count
    count_query = select(func.count()).select_from(Feedback)
    total_result = await session.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)

    # Execute
    result = await session.execute(query)
    items = result.scalars().all()

    # Format response (Sanitized)
    feedback_list = []
    for fb in items:
        feedback_list.append({
            "id": str(fb.id),
            "type": fb.type.value,
            "subject": fb.subject,
            "message": fb.message,
            "rating": fb.rating,
            "tool_name": fb.tool_name,
            "status": fb.status.value,
            "created_at": fb.created_at.isoformat(),
        })

    return {
        "items": feedback_list,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }


# Admin endpoints
@router.get("/admin/list")
async def list_feedback(
    admin: AdminUser,
    session: DbSession,
    status: Optional[FeedbackStatus] = None,
    type: Optional[FeedbackType] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """
    List all feedback (admin only).

    Supports filtering by status and type.
    """
    # Build query
    query = select(Feedback).order_by(Feedback.created_at.desc())

    if status:
        query = query.where(Feedback.status == status)
    if type:
        query = query.where(Feedback.type == type)

    # Get total count
    count_query = select(func.count()).select_from(Feedback)
    if status:
        count_query = count_query.where(Feedback.status == status)
    if type:
        count_query = count_query.where(Feedback.type == type)

    total_result = await session.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)

    # Execute
    result = await session.execute(query)
    items = result.scalars().all()

    # Format response
    feedback_list = []
    for fb in items:
        feedback_list.append({
            "id": str(fb.id),
            "type": fb.type.value,
            "subject": fb.subject,
            "message": fb.message,
            "rating": fb.rating,
            "tool_name": fb.tool_name,
            "status": fb.status.value,
            "admin_notes": fb.admin_notes,
            "user_id": str(fb.user_id) if fb.user_id else None,
            "guest_email": fb.guest_email,
            "guest_name": fb.guest_name,
            "ip_address": fb.ip_address,
            "created_at": fb.created_at.isoformat(),
        })

    return {
        "items": feedback_list,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/admin/stats")
async def get_feedback_stats(
    admin: AdminUser,
    session: DbSession,
):
    """Get feedback statistics (admin only)."""
    # Total counts by status
    status_query = select(
        Feedback.status,
        func.count(Feedback.id)
    ).group_by(Feedback.status)
    status_result = await session.execute(status_query)
    status_counts = {row[0].value: row[1] for row in status_result.all()}

    # Total counts by type
    type_query = select(
        Feedback.type,
        func.count(Feedback.id)
    ).group_by(Feedback.type)
    type_result = await session.execute(type_query)
    type_counts = {row[0].value: row[1] for row in type_result.all()}

    # Average rating
    avg_rating_query = select(func.avg(Feedback.rating)).where(Feedback.rating.isnot(None))
    avg_result = await session.execute(avg_rating_query)
    avg_rating = avg_result.scalar()

    # Recent count (last 7 days)
    from datetime import datetime, timedelta
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_query = select(func.count(Feedback.id)).where(Feedback.created_at >= week_ago)
    recent_result = await session.execute(recent_query)
    recent_count = recent_result.scalar() or 0

    # Pending count
    pending_count = status_counts.get("pending", 0)

    return {
        "total": sum(status_counts.values()),
        "pending": status_counts.get("pending", 0),
        "reviewed": status_counts.get("reviewed", 0),
        "in_progress": status_counts.get("in_progress", 0),
        "completed": status_counts.get("completed", 0),
        "dismissed": status_counts.get("dismissed", 0),
        "recent_7_days": recent_count,
        "average_rating": round(avg_rating, 1) if avg_rating else None,
        "by_status": status_counts,
        "by_type": type_counts,
    }


@router.get("/admin/{feedback_id}")
async def get_feedback_detail(
    feedback_id: uuid.UUID,
    admin: AdminUser,
    session: DbSession,
):
    """Get feedback detail (admin only)."""
    query = select(Feedback).where(Feedback.id == feedback_id)
    result = await session.execute(query)
    feedback = result.scalar_one_or_none()

    if not feedback:
        return {"error": "Feedback not found"}

    # Get user info if linked
    user_info = None
    if feedback.user_id:
        user_query = select(User).where(User.id == feedback.user_id)
        user_result = await session.execute(user_query)
        user = user_result.scalar_one_or_none()
        if user:
            user_info = {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
            }

    return {
        "id": str(feedback.id),
        "type": feedback.type.value,
        "subject": feedback.subject,
        "message": feedback.message,
        "rating": feedback.rating,
        "tool_name": feedback.tool_name,
        "status": feedback.status.value,
        "admin_notes": feedback.admin_notes,
        "user": user_info,
        "guest_email": feedback.guest_email,
        "guest_name": feedback.guest_name,
        "ip_address": feedback.ip_address,
        "user_agent": feedback.user_agent,
        "created_at": feedback.created_at.isoformat(),
        "updated_at": feedback.updated_at.isoformat(),
    }


@router.patch("/admin/{feedback_id}")
async def update_feedback(
    feedback_id: uuid.UUID,
    data: FeedbackUpdate,
    admin: AdminUser,
    session: DbSession,
):
    """Update feedback status and notes (admin only)."""
    query = select(Feedback).where(Feedback.id == feedback_id)
    result = await session.execute(query)
    feedback = result.scalar_one_or_none()

    if not feedback:
        return {"error": "Feedback not found"}

    # Update fields
    if data.status is not None:
        feedback.status = data.status
    if data.admin_notes is not None:
        feedback.admin_notes = data.admin_notes

    await session.commit()
    await session.refresh(feedback)

    return {
        "success": True,
        "id": str(feedback.id),
        "status": feedback.status.value,
        "admin_notes": feedback.admin_notes,
    }


@router.delete("/admin/{feedback_id}")
async def delete_feedback(
    feedback_id: uuid.UUID,
    admin: AdminUser,
    session: DbSession,
):
    """Delete feedback (admin only)."""
    query = select(Feedback).where(Feedback.id == feedback_id)
    result = await session.execute(query)
    feedback = result.scalar_one_or_none()

    if not feedback:
        return {"error": "Feedback not found"}

    await session.delete(feedback)
    await session.commit()

    return {"success": True, "message": "Feedback deleted"}
