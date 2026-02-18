"""User database model."""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from pydantic import EmailStr
from sqlmodel import Field, Relationship, SQLModel

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.history import UsageHistory


class User(BaseModel, table=True):
    """User model for authentication and profile."""

    __tablename__ = "users"

    # Profile
    email: EmailStr = Field(unique=True, index=True, nullable=False)
    full_name: str = Field(max_length=255, nullable=False)
    avatar_url: Optional[str] = Field(default=None, max_length=500)

    # Authentication
    hashed_password: Optional[str] = Field(default=None)  # NULL for OAuth users
    oauth_provider: Optional[str] = Field(default=None, max_length=50)  # google, etc.
    oauth_id: Optional[str] = Field(default=None, max_length=255)

    # Status
    is_active: bool = Field(default=True)
    is_verified: bool = Field(default=False)
    is_superuser: bool = Field(default=False)

    # Verification
    verification_token: Optional[str] = Field(default=None, max_length=500)
    verified_at: Optional[datetime] = Field(default=None)

    # Password reset
    password_reset_token: Optional[str] = Field(default=None, max_length=500)
    password_reset_expires: Optional[datetime] = Field(default=None)

    # Last login tracking
    last_login_at: Optional[datetime] = Field(default=None)
    last_login_ip: Optional[str] = Field(default=None, max_length=45)

    # Relationships
    usage_history: list["UsageHistory"] = Relationship(back_populates="user")

    def update_last_login(self, ip_address: str | None = None) -> None:
        """Update last login timestamp and IP."""
        # Use naive datetime (UTC) to match database column type
        self.last_login_at = datetime.utcnow()
        if ip_address:
            self.last_login_ip = ip_address


class UserCreate(SQLModel):
    """Schema for creating a user."""

    email: EmailStr
    full_name: str
    password: str


class UserLogin(SQLModel):
    """Schema for user login."""

    email: EmailStr
    password: str


class UserUpdate(SQLModel):
    """Schema for updating user profile."""

    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserResponse(SQLModel):
    """Schema for user response (public data)."""

    id: uuid.UUID
    email: EmailStr
    full_name: str
    avatar_url: Optional[str]
    is_verified: bool
    is_superuser: bool = False
    daily_uses_remaining: int = 0
    subscription_tier: str = "pro"
    created_at: datetime
