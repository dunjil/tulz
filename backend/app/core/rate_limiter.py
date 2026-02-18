"""Rate limiting configuration using slowapi with in-memory storage.

SECURITY: Implements tiered rate limiting to prevent abuse while allowing
legitimate usage. More expensive operations have stricter limits.

FAIR USE: Pro users get higher limits, free users are throttled harder.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings


def get_user_or_ip(request) -> str:
    """Get user ID if authenticated, otherwise IP address."""
    # Try to get user from request state (set by auth middleware)
    if hasattr(request.state, "user") and request.state.user:
        return f"user:{request.state.user.id}"
    return get_remote_address(request)


def get_tier_aware_key(request) -> str:
    """Get a key that includes tier information for differentiated rate limiting."""
    base_key = get_user_or_ip(request)
    # Check if user has pro subscription
    if hasattr(request.state, "user") and request.state.user:
        if hasattr(request.state, "subscription_tier"):
            tier = request.state.subscription_tier
        else:
            tier = "free"
        return f"{tier}:{base_key}"
    return f"anon:{base_key}"


# Create limiter with in-memory storage (default)
limiter = Limiter(
    key_func=get_user_or_ip,
    default_limits=[f"{settings.rate_limit_per_minute}/minute"],
    storage_uri="memory://",
)


def get_rate_limit_string(requests: int, period: str) -> str:
    """Generate rate limit string."""
    return f"{requests}/{period}"


# ========================================
# RATE LIMIT CONFIGURATIONS BY TIER
# ========================================

# Free tier limits - VERY STRICT to encourage upgrades
# Designed to allow basic testing but throttle heavy usage

# Authentication endpoints - same for all (security)
AUTH_RATE_LIMIT = "10/minute"
LOGIN_RATE_LIMIT = "5/minute"  # Very strict for login attempts
PASSWORD_RESET_RATE_LIMIT = "3/minute"

# ---- FREE TIER LIMITS (Throttled Hard) ----
# File processing - expensive operations
PDF_RATE_LIMIT_FREE = "3/minute"       # Only 3 PDF operations per minute
IMAGE_RATE_LIMIT_FREE = "5/minute"     # Only 5 image operations per minute
IMAGE_BATCH_RATE_LIMIT_FREE = "1/minute"  # Only 1 batch operation per minute
TOOL_RATE_LIMIT_FREE = "5/minute"      # General tools - 5/minute
WEBPDF_RATE_LIMIT_FREE = "2/minute"    # Website to PDF - expensive

# ---- PRO TIER LIMITS (Fair Use Policy) ----
# Higher limits for paying customers
PDF_RATE_LIMIT_PRO = "30/minute"       # 30 PDF operations per minute
IMAGE_RATE_LIMIT_PRO = "60/minute"     # 60 image operations per minute
IMAGE_BATCH_RATE_LIMIT_PRO = "10/minute"  # 10 batch operations per minute
TOOL_RATE_LIMIT_PRO = "60/minute"      # General tools - 60/minute
WEBPDF_RATE_LIMIT_PRO = "20/minute"    # Website to PDF

# ---- DAILY LIMITS (Fair Use Policy) ----
# Pro users: 500 operations/day (fair use)
# Free users: 3 operations/day (already enforced via usage_service)
PRO_DAILY_OPERATIONS_LIMIT = 500
PRO_DAILY_DATA_LIMIT_MB = 500  # 500 MB total uploads per day

# Legacy defaults (for backwards compatibility)
PDF_RATE_LIMIT = PDF_RATE_LIMIT_FREE
IMAGE_RATE_LIMIT = IMAGE_RATE_LIMIT_FREE
IMAGE_BATCH_RATE_LIMIT = IMAGE_BATCH_RATE_LIMIT_FREE
TOOL_RATE_LIMIT = TOOL_RATE_LIMIT_FREE

# Admin endpoints
ADMIN_RATE_LIMIT = "60/minute"


def get_rate_limit_for_tier(tier: str, limit_type: str) -> str:
    """Get the appropriate rate limit string based on user tier.

    Args:
        tier: 'free', 'pro', or 'anon'
        limit_type: 'pdf', 'image', 'image_batch', 'tool', 'webpdf'

    Returns:
        Rate limit string like "10/minute"
    """
    limits = {
        "pro": {
            "pdf": PDF_RATE_LIMIT_PRO,
            "image": IMAGE_RATE_LIMIT_PRO,
            "image_batch": IMAGE_BATCH_RATE_LIMIT_PRO,
            "tool": TOOL_RATE_LIMIT_PRO,
            "webpdf": WEBPDF_RATE_LIMIT_PRO,
        },
        "free": {
            "pdf": PDF_RATE_LIMIT_FREE,
            "image": IMAGE_RATE_LIMIT_FREE,
            "image_batch": IMAGE_BATCH_RATE_LIMIT_FREE,
            "tool": TOOL_RATE_LIMIT_FREE,
            "webpdf": WEBPDF_RATE_LIMIT_FREE,
        },
        "anon": {
            "pdf": PDF_RATE_LIMIT_FREE,
            "image": IMAGE_RATE_LIMIT_FREE,
            "image_batch": IMAGE_BATCH_RATE_LIMIT_FREE,
            "tool": TOOL_RATE_LIMIT_FREE,
            "webpdf": WEBPDF_RATE_LIMIT_FREE,
        },
    }

    tier_limits = limits.get(tier, limits["free"])
    return tier_limits.get(limit_type, TOOL_RATE_LIMIT_FREE)
