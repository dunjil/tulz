"""Admin API endpoints for dashboard analytics - Simplified for free model."""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Query
from sqlalchemy import func, select, distinct
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel

from app.api.deps import AdminUser, DbSession
from app.models.history import ToolType, UsageHistory
from app.models.page_visit import PageVisit
from app.models.user import User

router = APIRouter()


@router.get("/stats/overview")
async def get_overview_stats(
    admin: AdminUser,
    session: DbSession,
):
    """Get overview statistics for admin dashboard."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)

    # Total users
    total_users = await session.execute(select(func.count(User.id)))
    total_users_count = total_users.scalar() or 0

    # New users today
    new_users_today = await session.execute(
        select(func.count(User.id)).where(User.created_at >= today_start)
    )
    new_users_today_count = new_users_today.scalar() or 0

    # New users this week
    new_users_week = await session.execute(
        select(func.count(User.id)).where(User.created_at >= week_start)
    )
    new_users_week_count = new_users_week.scalar() or 0

    # New users this month
    new_users_month = await session.execute(
        select(func.count(User.id)).where(User.created_at >= month_start)
    )
    new_users_month_count = new_users_month.scalar() or 0

    # Total tool uses today
    uses_today = await session.execute(
        select(func.count(UsageHistory.id)).where(
            UsageHistory.created_at >= today_start
        )
    )
    uses_today_count = uses_today.scalar() or 0

    # Total tool uses this month
    uses_month = await session.execute(
        select(func.count(UsageHistory.id)).where(
            UsageHistory.created_at >= month_start
        )
    )
    uses_month_count = uses_month.scalar() or 0

    # Most used tool
    most_used_tool_query = await session.execute(
        select(UsageHistory.tool, func.count(UsageHistory.id))
        .group_by(UsageHistory.tool)
        .order_by(func.count(UsageHistory.id).desc())
        .limit(1)
    )
    most_used_row = most_used_tool_query.first()
    most_used_tool_name = str(most_used_row[0].value) if most_used_row else "None"

    # Page visits
    total_visits = await session.execute(select(func.count(PageVisit.id)))
    total_visits_count = total_visits.scalar() or 0

    visits_today = await session.execute(
        select(func.count(PageVisit.id)).where(PageVisit.created_at >= today_start)
    )
    visits_today_count = visits_today.scalar() or 0

    visits_week = await session.execute(
        select(func.count(PageVisit.id)).where(PageVisit.created_at >= week_start)
    )
    visits_week_count = visits_week.scalar() or 0

    visits_month = await session.execute(
        select(func.count(PageVisit.id)).where(PageVisit.created_at >= month_start)
    )
    visits_month_count = visits_month.scalar() or 0

    # Unique visitors today (by IP)
    unique_visitors_today = await session.execute(
        select(func.count(distinct(PageVisit.ip_address))).where(
            PageVisit.created_at >= today_start
        )
    )
    unique_visitors_today_count = unique_visitors_today.scalar() or 0

    return {
        "users": {
            "total": total_users_count,
            "new_today": new_users_today_count,
            "new_this_week": new_users_week_count,
            "new_this_month": new_users_month_count,
        },
        "usage": {
            "today": uses_today_count,
            "this_month": uses_month_count,
            "most_used_tool": most_used_tool_name,
        },
        "visits": {
            "total": total_visits_count,
            "today": visits_today_count,
            "this_week": visits_week_count,
            "this_month": visits_month_count,
            "unique_today": unique_visitors_today_count,
        },
    }


@router.get("/stats/tools")
async def get_tool_stats(
    admin: AdminUser,
    session: DbSession,
    days: int = Query(30, ge=1, le=365),
):
    """Get tool usage statistics."""
    start_date = datetime.utcnow() - timedelta(days=days)

    # Usage by tool
    tool_usage = await session.execute(
        select(UsageHistory.tool, func.count(UsageHistory.id))
        .where(UsageHistory.created_at >= start_date)
        .group_by(UsageHistory.tool)
        .order_by(func.count(UsageHistory.id).desc())
    )
    by_tool = {str(row[0].value): row[1] for row in tool_usage.all()}

    # Success rate
    total = await session.execute(
        select(func.count(UsageHistory.id)).where(
            UsageHistory.created_at >= start_date
        )
    )
    total_count = total.scalar() or 1

    successful = await session.execute(
        select(func.count(UsageHistory.id)).where(
            UsageHistory.created_at >= start_date,
            UsageHistory.success == True,
        )
    )
    successful_count = successful.scalar() or 0

    # Average processing time
    avg_time = await session.execute(
        select(func.avg(UsageHistory.processing_time_ms)).where(
            UsageHistory.created_at >= start_date,
            UsageHistory.success == True,
        )
    )
    avg_processing_time = float(avg_time.scalar() or 0)

    return {
        "period_days": days,
        "by_tool": by_tool,
        "success_rate": round(successful_count / total_count * 100, 2),
        "avg_processing_time_ms": round(avg_processing_time, 2),
        "total_uses": total_count,
    }


@router.get("/stats/usage-trend")
async def get_usage_trend(
    admin: AdminUser,
    session: DbSession,
    days: int = Query(30, ge=1, le=365),
):
    """Get daily usage trend."""
    start_date = datetime.utcnow() - timedelta(days=days)

    daily_usage = await session.execute(
        select(
            func.date(UsageHistory.created_at).label("date"),
            func.count(UsageHistory.id).label("count"),
        )
        .where(UsageHistory.created_at >= start_date)
        .group_by(func.date(UsageHistory.created_at))
        .order_by(func.date(UsageHistory.created_at))
    )

    trend = [
        {"date": str(row.date), "count": row.count}
        for row in daily_usage.all()
    ]

    return {"period_days": days, "trend": trend}


@router.get("/stats/visits")
async def get_visit_trend(
    admin: AdminUser,
    session: DbSession,
    days: int = Query(30, ge=1, le=365),
):
    """Get daily page visit trend."""
    start_date = datetime.utcnow() - timedelta(days=days)

    daily_visits = await session.execute(
        select(
            func.date(PageVisit.created_at).label("date"),
            func.count(PageVisit.id).label("visits"),
            func.count(distinct(PageVisit.ip_address)).label("unique_visitors"),
        )
        .where(PageVisit.created_at >= start_date)
        .group_by(func.date(PageVisit.created_at))
        .order_by(func.date(PageVisit.created_at))
    )

    trend = [
        {"date": str(row.date), "visits": row.visits, "unique_visitors": row.unique_visitors}
        for row in daily_visits.all()
    ]

    # Top pages
    top_pages = await session.execute(
        select(PageVisit.path, func.count(PageVisit.id).label("count"))
        .where(PageVisit.created_at >= start_date)
        .group_by(PageVisit.path)
        .order_by(func.count(PageVisit.id).desc())
        .limit(10)
    )

    return {
        "period_days": days,
        "trend": trend,
        "top_pages": [{"path": row.path, "count": row.count} for row in top_pages.all()],
    }



@router.get("/stats/countries")
async def get_country_stats(
    admin: AdminUser,
    session: DbSession,
    days: int = Query(30, ge=1, le=365),
):
    """Get usage statistics by country."""
    start_date = datetime.utcnow() - timedelta(days=days)

    country_usage = await session.execute(
        select(
            UsageHistory.country_code,
            UsageHistory.country_name,
            func.count(UsageHistory.id).label("total_uses"),
            func.count(distinct(UsageHistory.user_id)).label("unique_users"),
            func.count(distinct(UsageHistory.ip_address)).label("unique_ips"),
        )
        .where(
            UsageHistory.created_at >= start_date,
            UsageHistory.country_code != None,
        )
        .group_by(UsageHistory.country_code, UsageHistory.country_name)
        .order_by(func.count(UsageHistory.id).desc())
    )

    countries = [
        {
            "country_code": row.country_code,
            "country_name": row.country_name,
            "total_uses": row.total_uses,
            "unique_users": row.unique_users,
            "unique_ips": row.unique_ips,
        }
        for row in country_usage.all()
    ]

    return {
        "period_days": days,
        "countries": countries,
    }


@router.get("/users")
async def list_users(
    admin: AdminUser,
    session: DbSession,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
):
    """List all users with pagination and filtering."""
    offset = (page - 1) * per_page

    # Build base filter conditions
    conditions = []
    if search:
        conditions.append(
            User.email.ilike(f"%{search}%") | User.full_name.ilike(f"%{search}%")
        )

    # Get total count
    count_query = select(func.count(User.id))
    if conditions:
        count_query = count_query.where(*conditions)
    total = (await session.execute(count_query)).scalar() or 0

    # Subquery for usage counts per user
    usage_counts = (
        select(
            UsageHistory.user_id,
            func.count(UsageHistory.id).label("usage_count")
        )
        .group_by(UsageHistory.user_id)
        .subquery()
    )

    # Main query with LEFT JOIN
    query = (
        select(
            User,
            func.coalesce(usage_counts.c.usage_count, 0).label("usage_count")
        )
        .outerjoin(usage_counts, User.id == usage_counts.c.user_id)
        .order_by(User.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )

    if conditions:
        query = query.where(*conditions)

    result = await session.execute(query)
    rows = result.all()

    # Format response
    user_data = []
    for row in rows:
        user = row[0]
        usage_count = row[1]

        user_data.append({
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "is_verified": user.is_verified,
            "is_active": user.is_active,
            "is_superuser": user.is_superuser,
            "created_at": user.created_at.isoformat(),
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
            "total_uses": usage_count,
        })

    return {
        "users": user_data,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
    }


@router.post("/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: str,
    admin: AdminUser,
    session: DbSession,
):
    """Toggle user active status."""
    import uuid as uuid_module

    try:
        uid = uuid_module.UUID(user_id)
    except ValueError:
        from app.core.exceptions import BadRequestError
        raise BadRequestError(message="Invalid user ID")

    result = await session.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()

    if not user:
        from app.core.exceptions import NotFoundError
        raise NotFoundError(message="User not found")

    user.is_active = not user.is_active
    await session.commit()

    return {"success": True, "is_active": user.is_active}


@router.delete("/users/{user_id}", status_code=200)
async def delete_user(
    user_id: str,
    admin: AdminUser,
    session: DbSession,
):
    """Permanently delete a user account.

    Superusers must be deleted via DELETE /admin/admins/{user_id}.
    You cannot delete your own account.
    """
    import uuid as uuid_module
    from app.core.exceptions import BadRequestError, NotFoundError

    try:
        uid = uuid_module.UUID(user_id)
    except ValueError:
        raise BadRequestError(message="Invalid user ID")

    if uid == admin.id:
        raise BadRequestError(message="You cannot delete your own account")

    result = await session.execute(select(User).where(User.id == uid))
    target = result.scalar_one_or_none()

    if not target:
        raise NotFoundError(message="User not found")

    if target.is_superuser:
        raise BadRequestError(
            message="Cannot delete a superuser via this endpoint. Use DELETE /admin/admins/{user_id}"
        )

    await session.delete(target)
    await session.commit()

    return {"success": True, "deleted_id": user_id}


# ---------------------------------------------------------------------------
# Superuser management
# ---------------------------------------------------------------------------

class CreateAdminRequest(SQLModel):
    email: str
    full_name: str
    password: str


@router.post("/admins", status_code=201)
async def create_admin(
    data: CreateAdminRequest,
    admin: AdminUser,
    session: DbSession,
):
    """Create a new superuser account."""
    from app.core.exceptions import BadRequestError
    from app.core.security import get_password_hash

    # Check for duplicate email
    existing = await session.execute(select(User).where(User.email == data.email.lower()))
    if existing.scalar_one_or_none():
        raise BadRequestError(message="Email already registered")

    new_admin = User(
        email=data.email.lower(),
        full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
        is_verified=True,
        is_superuser=True,
        is_active=True,
    )
    session.add(new_admin)
    await session.commit()
    await session.refresh(new_admin)

    return {
        "id": str(new_admin.id),
        "email": new_admin.email,
        "full_name": new_admin.full_name,
        "is_superuser": new_admin.is_superuser,
        "created_at": new_admin.created_at.isoformat(),
    }


@router.delete("/admins/{user_id}", status_code=200)
async def delete_admin(
    user_id: str,
    admin: AdminUser,
    session: DbSession,
):
    """Delete a superuser account. Cannot delete yourself."""
    import uuid as uuid_module
    from app.core.exceptions import BadRequestError, NotFoundError

    try:
        uid = uuid_module.UUID(user_id)
    except ValueError:
        raise BadRequestError(message="Invalid user ID")

    if uid == admin.id:
        raise BadRequestError(message="You cannot delete your own account")

    result = await session.execute(select(User).where(User.id == uid))
    target = result.scalar_one_or_none()

    if not target:
        raise NotFoundError(message="User not found")

    if not target.is_superuser:
        raise BadRequestError(message="User is not a superuser")

    await session.delete(target)
    await session.commit()

    return {"success": True, "deleted_id": user_id}
