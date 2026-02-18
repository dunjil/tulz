"""User service for user management operations."""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError, NotFoundError
from app.core.security import get_password_hash
from app.models.user import User


class UserService:
    """Service for user management operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        """Get user by ID."""
        result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        result = await self.session.execute(
            select(User).where(User.email == email.lower())
        )
        return result.scalar_one_or_none()

    async def get_by_oauth(self, provider: str, oauth_id: str) -> Optional[User]:
        """Get user by OAuth provider and ID."""
        result = await self.session.execute(
            select(User).where(User.oauth_provider == provider, User.oauth_id == oauth_id)
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        email: str,
        full_name: str,
        password: Optional[str] = None,
        oauth_provider: Optional[str] = None,
        oauth_id: Optional[str] = None,
        avatar_url: Optional[str] = None,
        is_verified: bool = False,
        check_existing: bool = True,
    ) -> User:
        """Create a new user.

        Args:
            check_existing: If True, raises error if email exists. Set to False
                           for internal operations where caller handles existing users.
        """
        # Check if email already exists
        existing = await self.get_by_email(email)
        if existing and check_existing:
            raise BadRequestError(message="Email already registered")

        # Create user
        user = User(
            email=email.lower(),
            full_name=full_name,
            hashed_password=get_password_hash(password) if password else None,
            oauth_provider=oauth_provider,
            oauth_id=oauth_id,
            avatar_url=avatar_url,
            is_verified=is_verified,
        )
        self.session.add(user)
        await self.session.flush()

        return user

    async def update(
        self,
        user: User,
        full_name: Optional[str] = None,
        avatar_url: Optional[str] = None,
    ) -> User:
        """Update user profile."""
        if full_name is not None:
            user.full_name = full_name
        if avatar_url is not None:
            user.avatar_url = avatar_url
        user.updated_at = datetime.utcnow()
        await self.session.flush()
        return user

    async def update_password(self, user: User, new_password: str) -> User:
        """Update user password."""
        user.hashed_password = get_password_hash(new_password)
        user.password_reset_token = None
        user.password_reset_expires = None
        user.updated_at = datetime.utcnow()
        await self.session.flush()
        return user

    async def verify_email(self, user: User) -> User:
        """Mark user email as verified."""
        user.is_verified = True
        user.verified_at = datetime.utcnow()
        user.verification_token = None
        user.updated_at = datetime.utcnow()
        await self.session.flush()
        return user

    async def set_verification_token(self, user: User, token: str) -> User:
        """Set email verification token."""
        user.verification_token = token
        user.updated_at = datetime.utcnow()
        await self.session.flush()
        return user

    async def set_password_reset_token(
        self, user: User, token: str, expires: datetime
    ) -> User:
        """Set password reset token."""
        user.password_reset_token = token
        user.password_reset_expires = expires
        user.updated_at = datetime.utcnow()
        await self.session.flush()
        return user


    async def deactivate(self, user: User) -> User:
        """Deactivate user account."""
        user.is_active = False
        user.updated_at = datetime.utcnow()
        await self.session.flush()
        return user
