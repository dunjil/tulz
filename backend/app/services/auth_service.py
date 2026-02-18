"""Authentication service."""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import BadRequestError, UnauthorizedError
from app.core.security import (
    create_access_token,
    create_email_verification_token,
    create_password_reset_token,
    create_refresh_token,
    verify_email_token,
    verify_password,
    verify_password_reset_token,
    verify_token,
)
from app.models.user import User
from app.schemas.auth import TokenResponse
from app.services.user_service import UserService


class AuthService:
    """Service for authentication operations."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_service = UserService(session)

    async def register(
        self,
        email: str,
        full_name: str,
        password: str,
    ) -> tuple[User, str]:
        """Register a new user and return user with verification token."""
        user = await self.user_service.create(
            email=email,
            full_name=full_name,
            password=password,
            is_verified=False,
        )

        # Generate verification token
        verification_token = create_email_verification_token(email)
        await self.user_service.set_verification_token(user, verification_token)

        return user, verification_token

    async def login(
        self,
        email: str,
        password: str,
        ip_address: Optional[str] = None,
    ) -> TokenResponse:
        """Authenticate user and return tokens."""
        user = await self.user_service.get_by_email(email)

        if not user:
            raise UnauthorizedError(message="Invalid email or password")


        if not verify_password(password, user.hashed_password):
            raise UnauthorizedError(message="Invalid email or password")

        if not user.is_active:
            raise UnauthorizedError(message="Account is deactivated")

        # Update last login
        user.update_last_login(ip_address)
        await self.session.flush()

        return self._create_tokens(user)

    async def refresh_tokens(self, refresh_token: str) -> TokenResponse:
        """Refresh access token using refresh token."""
        payload = verify_token(refresh_token, token_type="refresh")
        user_id = payload.get("sub")

        if not user_id:
            raise UnauthorizedError(message="Invalid refresh token")

        user = await self.user_service.get_by_id(uuid.UUID(user_id))

        if not user or not user.is_active:
            raise UnauthorizedError(message="User not found or inactive")

        return self._create_tokens(user)

    async def verify_email(self, token: str) -> User:
        """Verify user email with token."""
        email = verify_email_token(token)
        user = await self.user_service.get_by_email(email)

        if not user:
            raise BadRequestError(message="Invalid verification token")

        if user.is_verified:
            raise BadRequestError(message="Email already verified")

        return await self.user_service.verify_email(user)

    async def request_password_reset(self, email: str) -> Optional[str]:
        """Request password reset and return token (or None if user not found)."""
        user = await self.user_service.get_by_email(email)

        if not user:
            # Don't reveal if email exists
            return None

        if not user.hashed_password:
            # OAuth users can't reset password
            return None

        token = create_password_reset_token(email)
        expires = datetime.now(timezone.utc) + timedelta(hours=1)
        await self.user_service.set_password_reset_token(user, token, expires)

        return token

    async def reset_password(self, token: str, new_password: str) -> User:
        """Reset password with token."""
        email = verify_password_reset_token(token)
        user = await self.user_service.get_by_email(email)

        if not user:
            raise BadRequestError(message="Invalid reset token")

        if not user.password_reset_token or user.password_reset_token != token:
            raise BadRequestError(message="Invalid or expired reset token")

        if user.password_reset_expires and user.password_reset_expires < datetime.now(
            timezone.utc
        ):
            raise BadRequestError(message="Reset token has expired")

        return await self.user_service.update_password(user, new_password)

    async def change_password(
        self,
        user: User,
        current_password: str,
        new_password: str,
    ) -> User:
        """Change password for authenticated user."""
        if not user.hashed_password:
            raise BadRequestError(
                message="Cannot change password for OAuth accounts"
            )

        if not verify_password(current_password, user.hashed_password):
            raise BadRequestError(message="Current password is incorrect")

        return await self.user_service.update_password(user, new_password)

    def _create_tokens(self, user: User) -> TokenResponse:
        """Create access and refresh tokens for user."""
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60,
        )
