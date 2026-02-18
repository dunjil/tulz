"""Usage tracking and limit enforcement service.

Implements:
- Free tier: Unlimited usage (iLovePDF model - no limits, no login required)
- Pro tier: 500 uses per day (fair use soft limit)
- Rate limiting per tier
- Analytics tracking for all usage
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import UsageLimitError
from app.core.rate_limiter import PRO_DAILY_OPERATIONS_LIMIT, PRO_DAILY_DATA_LIMIT_MB
from app.models.history import ToolType, UsageHistory
from app.models.user import User
from app.services.geoip_service import GeoIPService


# In-memory rate limiting (resets on server restart)
_ip_usage_cache: dict[str, dict] = {}

# In-memory pro user daily usage cache (for fair use)
_pro_usage_cache: dict[str, dict] = {}


class UsageService:
    """Service for tracking and enforcing usage limits."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def check_and_record_usage(
        self,
        tool: ToolType,
        operation: str,
        user: Optional[User] = None,
        ip_address: str = "unknown",
        user_agent: Optional[str] = None,
        input_metadata: Optional[dict] = None,
    ) -> tuple[UsageHistory, str]:
        """
        Check if usage is allowed and record it.
        Returns (usage_history, tier) or raises UsageLimitError.
        """
        # Everyone gets unlimited access now
        tier = "pro"

        # Get country from IP (non-blocking, best effort)
        country_code, country_name = await GeoIPService.get_country(ip_address)

        # Record usage
        history = UsageHistory(
            user_id=user.id if user else None,
            ip_address=ip_address,
            user_agent=user_agent,
            country_code=country_code,
            country_name=country_name,
            tool=tool,
            operation=operation,
            input_metadata=input_metadata,
            tier_at_use=tier,
        )
        self.session.add(history)

        await self.session.flush()
        return history, tier

    async def complete_usage(
        self,
        history: UsageHistory,
        processing_time_ms: int,
        output_metadata: Optional[dict] = None,
        success: bool = True,
        error_message: Optional[str] = None,
    ) -> UsageHistory:
        """Update usage history with completion info."""
        history.processing_time_ms = processing_time_ms
        history.output_metadata = output_metadata
        history.success = success
        history.error_message = error_message
        await self.session.flush()
        return history

    async def get_remaining_uses(
        self,
        user: Optional[User] = None,
        ip_address: str = "unknown",
    ) -> dict:
        """Get remaining uses for user or IP."""
        # UNLIMITED ACCESS FOR EVERYONE (Paywalls Removed)
        return {
            "tier": "pro",
            "remaining": None,
            "is_unlimited": True,
        }

    async def get_usage_stats(self, user: User) -> dict:
        """Get usage statistics for a user."""
        # Total uses
        total_result = await self.session.execute(
            select(func.count(UsageHistory.id)).where(
                UsageHistory.user_id == user.id
            )
        )
        total_uses = total_result.scalar() or 0

        # Uses today
        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        today_result = await self.session.execute(
            select(func.count(UsageHistory.id)).where(
                UsageHistory.user_id == user.id,
                UsageHistory.created_at >= today_start,
            )
        )
        uses_today = today_result.scalar() or 0

        # Uses this month
        month_start = today_start.replace(day=1)
        month_result = await self.session.execute(
            select(func.count(UsageHistory.id)).where(
                UsageHistory.user_id == user.id,
                UsageHistory.created_at >= month_start,
            )
        )
        uses_this_month = month_result.scalar() or 0

        # By tool
        tool_result = await self.session.execute(
            select(UsageHistory.tool, func.count(UsageHistory.id))
            .where(UsageHistory.user_id == user.id)
            .group_by(UsageHistory.tool)
        )
        by_tool = {str(row[0].value): row[1] for row in tool_result.all()}

        # Recent history
        recent_result = await self.session.execute(
            select(UsageHistory)
            .where(UsageHistory.user_id == user.id)
            .order_by(UsageHistory.created_at.desc())
            .limit(10)
        )
        recent = recent_result.scalars().all()

        return {
            "total_uses": total_uses,
            "uses_today": uses_today,
            "uses_this_month": uses_this_month,
            "by_tool": by_tool,
            "recent_history": recent,
        }

    async def get_history(
        self, user: User, limit: int = 50
    ) -> list[UsageHistory]:
        """Get usage history for a user."""
        result = await self.session.execute(
            select(UsageHistory)
            .where(UsageHistory.user_id == user.id)
            .order_by(UsageHistory.created_at.desc())
            .limit(limit)
        )
        return result.scalars().all()


    async def _can_use(
        self,
        tier: str,
        ip_address: str,
        user: Optional[User] = None,
    ) -> bool:
        """Check if usage is allowed based on tier and fair use policy."""
        # UNLIMITED ACCESS FOR EVERYONE (Paywalls Removed)
        return True

    def _get_pro_daily_usage(self, user_id: str) -> int:
        """Get daily usage count for a pro user (fair use tracking)."""
        cache_entry = _pro_usage_cache.get(user_id)
        if not cache_entry:
            return 0

        # Check if cache needs reset (new day)
        today = datetime.now(timezone.utc).date()
        if cache_entry.get("date") != today:
            return 0

        return cache_entry.get("count", 0)

    def _record_pro_usage(self, user_id: str) -> None:
        """Record usage for a pro user (fair use tracking)."""
        today = datetime.now(timezone.utc).date()
        cache_entry = _pro_usage_cache.get(user_id, {})

        if cache_entry.get("date") != today:
            cache_entry = {"date": today, "count": 0}

        cache_entry["count"] = cache_entry.get("count", 0) + 1
        _pro_usage_cache[user_id] = cache_entry

    def _get_ip_remaining_uses(self, ip_address: str) -> int:
        """Get remaining uses for an IP address."""
        cache_entry = _ip_usage_cache.get(ip_address)
        if not cache_entry:
            return settings.free_daily_uses

        # Check if cache needs reset (new day)
        today = datetime.now(timezone.utc).date()
        if cache_entry.get("date") != today:
            return settings.free_daily_uses

        used = cache_entry.get("count", 0)
        return max(0, settings.free_daily_uses - used)

    def _record_ip_usage(self, ip_address: str) -> None:
        """Record usage for an IP address."""
        today = datetime.now(timezone.utc).date()
        cache_entry = _ip_usage_cache.get(ip_address, {})

        if cache_entry.get("date") != today:
            cache_entry = {"date": today, "count": 0}

        cache_entry["count"] = cache_entry.get("count", 0) + 1
        _ip_usage_cache[ip_address] = cache_entry

    def _get_next_reset_time(self) -> str:
        """Get next daily reset time (midnight UTC)."""
        now = datetime.now(timezone.utc)
        tomorrow = now.replace(hour=0, minute=0, second=0, microsecond=0)
        if tomorrow <= now:
            from datetime import timedelta
            tomorrow += timedelta(days=1)
        return tomorrow.isoformat()

    async def record_usage_analytics_only(
        self,
        tool: ToolType,
        operation: str,
        user: Optional[User] = None,
        ip_address: str = "unknown",
        user_agent: Optional[str] = None,
        input_metadata: Optional[dict] = None,
        output_metadata: Optional[dict] = None,
        processing_time_ms: int = 0,
        success: bool = True,
        error_message: Optional[str] = None,
    ) -> UsageHistory:
        """
        Record usage for analytics purposes only (no limit enforcement).
        Use this for free tools where we want to track usage without blocking.
        """
        tier = "free"

        # Get country from IP (non-blocking, best effort)
        country_code, country_name = await GeoIPService.get_country(ip_address)

        # Record usage
        history = UsageHistory(
            user_id=user.id if user else None,
            ip_address=ip_address,
            user_agent=user_agent,
            country_code=country_code,
            country_name=country_name,
            tool=tool,
            operation=operation,
            input_metadata=input_metadata,
            output_metadata=output_metadata,
            processing_time_ms=processing_time_ms,
            tier_at_use=tier,
            success=success,
            error_message=error_message,
        )
        self.session.add(history)
        await self.session.flush()
        return history
