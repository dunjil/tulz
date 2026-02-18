"""User endpoints."""

from fastapi import APIRouter

from app.api.deps import ClientIP, CurrentUser, DbSession, OptionalUser
from app.models.user import UserResponse, UserUpdate
from app.schemas.common import MessageResponse
from app.services.usage_service import UsageService
from app.services.user_service import UserService

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    current_user: CurrentUser,
    session: DbSession,
):
    """Get current user profile."""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        avatar_url=current_user.avatar_url,
        is_verified=current_user.is_verified,
        is_superuser=current_user.is_superuser,
        daily_uses_remaining=0,
        subscription_tier="pro",
        created_at=current_user.created_at,
    )


@router.patch("/me", response_model=UserResponse)
async def update_current_user(
    data: UserUpdate,
    current_user: CurrentUser,
    session: DbSession,
):
    """Update current user profile."""
    user_service = UserService(session)
    updated_user = await user_service.update(
        user=current_user,
        full_name=data.full_name,
        avatar_url=data.avatar_url,
    )
    return UserResponse(
        id=updated_user.id,
        email=updated_user.email,
        full_name=updated_user.full_name,
        avatar_url=updated_user.avatar_url,
        is_verified=updated_user.is_verified,
        is_superuser=updated_user.is_superuser,
        daily_uses_remaining=0,
        subscription_tier="pro",
        created_at=updated_user.created_at,
    )


@router.get("/me/usage")
async def get_usage_stats(
    current_user: CurrentUser,
    session: DbSession,
):
    """Get usage statistics for current user."""
    usage_service = UsageService(session)
    stats = await usage_service.get_usage_stats(current_user)

    # Convert recent history to serializable format
    recent = [
        {
            "id": str(h.id),
            "tool": h.tool.value,
            "operation": h.operation,
            "processing_time_ms": h.processing_time_ms,
            "tier_at_use": h.tier_at_use,
            "success": h.success,
            "created_at": h.created_at.isoformat(),
        }
        for h in stats["recent_history"]
    ]

    return {
        "total_uses": stats["total_uses"],
        "uses_today": stats["uses_today"],
        "uses_this_month": stats["uses_this_month"],
        "by_tool": stats["by_tool"],
        "recent_history": recent,
    }


@router.get("/me/remaining")
async def get_remaining_uses(
    user: OptionalUser,
    session: DbSession,
    client_ip: ClientIP,
):
    """Get remaining uses for current user or IP."""
    usage_service = UsageService(session)
    return await usage_service.get_remaining_uses(user=user, ip_address=client_ip)


@router.get("/me/history")
async def get_usage_history(
    current_user: CurrentUser,
    session: DbSession,
    limit: int = 50,
):
    """Get usage history for current user."""
    usage_service = UsageService(session)
    history = await usage_service.get_history(current_user, limit=limit)

    return {
        "history": [
            {
                "id": str(h.id),
                "tool": h.tool.value,
                "operation": h.operation,
                "processing_time_ms": h.processing_time_ms,
                "tier_at_use": h.tier_at_use,
                "success": h.success,
                "created_at": h.created_at.isoformat(),
            }
            for h in history
        ]
    }


@router.delete("/me", response_model=MessageResponse)
async def deactivate_account(
    current_user: CurrentUser,
    session: DbSession,
):
    """Deactivate current user account."""
    user_service = UserService(session)
    await user_service.deactivate(current_user)
    return MessageResponse(message="Account deactivated successfully.")
