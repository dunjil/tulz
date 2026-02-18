"""Feedback database model for reviews and suggestions."""

import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional

from pydantic import EmailStr
from sqlmodel import Field, Relationship, SQLModel

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.user import User


class FeedbackType(str, Enum):
    """Type of feedback."""

    REVIEW = "review"
    SUGGESTION = "suggestion"
    BUG_REPORT = "bug_report"
    FEATURE_REQUEST = "feature_request"


class FeedbackStatus(str, Enum):
    """Status of feedback."""

    PENDING = "pending"
    REVIEWED = "reviewed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DISMISSED = "dismissed"


class Feedback(BaseModel, table=True):
    """Feedback model for user reviews and suggestions."""

    __tablename__ = "feedback"

    # Content
    type: FeedbackType = Field(default=FeedbackType.REVIEW)
    subject: str = Field(max_length=200, nullable=False)
    message: str = Field(nullable=False)
    rating: Optional[int] = Field(default=None, ge=1, le=5)  # 1-5 star rating for reviews

    # Tool reference (optional)
    tool_name: Optional[str] = Field(default=None, max_length=100)

    # Status
    status: FeedbackStatus = Field(default=FeedbackStatus.PENDING)
    admin_notes: Optional[str] = Field(default=None)

    # User info (optional for anonymous)
    user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="users.id", index=True)
    guest_email: Optional[str] = Field(default=None, max_length=255)
    guest_name: Optional[str] = Field(default=None, max_length=100)

    # Metadata
    ip_address: Optional[str] = Field(default=None, max_length=45)
    user_agent: Optional[str] = Field(default=None, max_length=500)

    # Relationships
    user: Optional["User"] = Relationship()


class FeedbackCreate(SQLModel):
    """Schema for creating feedback."""

    type: FeedbackType = FeedbackType.REVIEW
    subject: str
    message: str
    rating: Optional[int] = None
    tool_name: Optional[str] = None
    guest_email: Optional[str] = None
    guest_name: Optional[str] = None


class FeedbackUpdate(SQLModel):
    """Schema for updating feedback (admin only)."""

    status: Optional[FeedbackStatus] = None
    admin_notes: Optional[str] = None


class FeedbackResponse(SQLModel):
    """Schema for feedback response."""

    id: uuid.UUID
    type: FeedbackType
    subject: str
    message: str
    rating: Optional[int]
    tool_name: Optional[str]
    status: FeedbackStatus
    admin_notes: Optional[str]
    user_id: Optional[uuid.UUID]
    guest_email: Optional[str]
    guest_name: Optional[str]
    created_at: datetime
