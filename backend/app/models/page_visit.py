"""Page visit database model."""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Index
from sqlmodel import Field, SQLModel

from app.models.base import BaseModel


class PageVisit(BaseModel, table=True):
    """Track page visits for analytics."""

    __tablename__ = "page_visits"

    # Composite indexes for performance optimization
    __table_args__ = (
        # Index for path analytics queries
        Index("ix_page_visits_path_created", "path", "created_at"),
        # Index for general analytics
        Index("ix_page_visits_created", "created_at"),
    )

    # Request info
    path: str = Field(index=True)
    ip_address: Optional[str] = Field(default=None, max_length=45)
    user_agent: Optional[str] = Field(default=None, max_length=500)
    referrer: Optional[str] = Field(default=None, max_length=500)

    # Browser/Device info (optional, extracted from UA or client-side)
    device_type: Optional[str] = Field(default=None, max_length=20)  # mobile, tablet, desktop
    browser: Optional[str] = Field(default=None, max_length=50)


class PageVisitCreate(SQLModel):
    """Schema for creating a page visit."""

    path: str
    referrer: Optional[str] = None
