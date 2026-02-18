"""API dependencies for dependency injection."""

import uuid
from typing import Annotated, Optional

from fastapi import Depends, Header, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import verify_token
from app.db.session import get_session
from app.models.user import User
from app.services.user_service import UserService

# Security scheme
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[
        Optional[HTTPAuthorizationCredentials], Depends(security)
    ],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> User:
    """Get current authenticated user (required)."""
    if not credentials:
        raise UnauthorizedError(message="Not authenticated")

    token = credentials.credentials
    payload = verify_token(token, token_type="access")
    user_id = payload.get("sub")

    if not user_id:
        raise UnauthorizedError(message="Invalid token")

    user_service = UserService(session)
    user = await user_service.get_by_id(uuid.UUID(user_id))

    if not user:
        raise UnauthorizedError(message="User not found")

    if not user.is_active:
        raise UnauthorizedError(message="User account is deactivated")

    return user


async def get_current_user_optional(
    credentials: Annotated[
        Optional[HTTPAuthorizationCredentials], Depends(security)
    ],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Optional[User]:
    """Get current user if authenticated, otherwise None."""
    if not credentials:
        return None

    try:
        token = credentials.credentials
        payload = verify_token(token, token_type="access")
        user_id = payload.get("sub")

        if not user_id:
            return None

        user_service = UserService(session)
        user = await user_service.get_by_id(uuid.UUID(user_id))

        if user and user.is_active:
            return user
    except Exception:
        pass

    return None


def get_client_ip(request: Request) -> str:
    """Extract client IP from request."""
    # Check for forwarded headers (behind proxy)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()

    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip

    # Direct connection
    if request.client:
        return request.client.host

    return "unknown"


def get_user_agent(
    user_agent: Annotated[Optional[str], Header(alias="User-Agent")] = None
) -> Optional[str]:
    """Extract user agent from request headers."""
    return user_agent


async def get_admin_user(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Get current user and verify admin privileges."""
    if not user.is_superuser:
        raise ForbiddenError(message="Admin access required")
    return user


# Type aliases for cleaner dependency injection
CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[Optional[User], Depends(get_current_user_optional)]
AdminUser = Annotated[User, Depends(get_admin_user)]
DbSession = Annotated[AsyncSession, Depends(get_session)]
ClientIP = Annotated[str, Depends(get_client_ip)]
UserAgent = Annotated[Optional[str], Depends(get_user_agent)]
