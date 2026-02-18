"""Usage history database model."""

import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import Index
from sqlmodel import Column, Field, Relationship, SQLModel
from sqlalchemy.dialects.postgresql import JSONB, INET

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.user import User


class ToolType(str, Enum):
    """Available tools."""

    QRCODE = "qrcode"
    CALCULATOR = "calculator"
    IMAGE = "image"
    PDF = "pdf"
    PDF_FILLER = "pdf_filler"
    EXCEL = "excel"
    FAVICON = "favicon"
    WEBPDF = "webpdf"
    CV = "cv"
    JSON = "json"
    MARKDOWN = "markdown"
    DIFF = "diff"
    INVOICE = "invoice"
    OCR = "ocr"


class UsageHistory(BaseModel, table=True):
    """Track tool usage for analytics and billing."""

    __tablename__ = "usage_history"

    # Composite indexes for performance optimization
    __table_args__ = (
        # Index for user analytics queries (user_id + created_at)
        Index("ix_usage_history_user_created", "user_id", "created_at"),
        # Index for tier/tool analytics
        Index("ix_usage_history_tier_tool_created", "tier_at_use", "tool", "created_at"),
        # Index for country analytics
        Index("ix_usage_history_country_created", "country_code", "created_at"),
    )

    # User (optional - NULL for anonymous)
    user_id: Optional[uuid.UUID] = Field(
        foreign_key="users.id", index=True, default=None
    )

    # Request info
    ip_address: str = Field(max_length=45, index=True)  # IPv4 or IPv6
    user_agent: Optional[str] = Field(default=None, max_length=500)
    country_code: Optional[str] = Field(default=None, max_length=2, index=True)  # ISO 3166-1 alpha-2
    country_name: Optional[str] = Field(default=None, max_length=100)

    # Tool info
    tool: ToolType = Field(index=True, nullable=False)
    operation: str = Field(max_length=100)  # e.g., "generate", "background_removal"

    # Input/output metadata
    input_metadata: Optional[dict[str, Any]] = Field(
        default=None, sa_column=Column(JSONB)
    )  # file sizes, parameters, etc.
    output_metadata: Optional[dict[str, Any]] = Field(
        default=None, sa_column=Column(JSONB)
    )  # result info, watermarked, etc.

    # Performance
    processing_time_ms: int = Field(default=0)

    # Subscription tier at time of use
    tier_at_use: str = Field(default="free", max_length=20)

    # Status
    success: bool = Field(default=True)
    error_message: Optional[str] = Field(default=None, max_length=500)

    # Relationships
    user: Optional["User"] = Relationship(back_populates="usage_history")


class UsageHistoryCreate(SQLModel):
    """Schema for creating usage history."""

    tool: ToolType
    operation: str
    input_metadata: Optional[dict[str, Any]] = None
    processing_time_ms: int = 0
    success: bool = True
    error_message: Optional[str] = None


class UsageHistoryResponse(SQLModel):
    """Schema for usage history response."""

    id: uuid.UUID
    tool: ToolType
    operation: str
    processing_time_ms: int
    tier_at_use: str
    success: bool
    created_at: datetime


class UsageStats(SQLModel):
    """Schema for usage statistics."""

    total_uses: int
    uses_today: int
    uses_this_month: int
    by_tool: dict[str, int]
    recent_history: list[UsageHistoryResponse]
