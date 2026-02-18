"""Donation database model."""

import uuid
from decimal import Decimal
from typing import Optional

from sqlmodel import Field, SQLModel

from app.models.base import BaseModel


class Donation(BaseModel, table=True):
    """Donation record model."""

    __tablename__ = "donations"

    # Donor info
    email: str = Field(max_length=255, index=True)
    name: Optional[str] = Field(default=None, max_length=255)

    # Amount
    amount: Decimal = Field(decimal_places=2, nullable=False)
    currency: str = Field(max_length=3, default="USD")

    # Transaction info
    tx_ref: str = Field(max_length=255, unique=True, index=True)
    transaction_id: str = Field(max_length=255, unique=True, index=True)

    # Optional link to user
    user_id: Optional[uuid.UUID] = Field(
        default=None, foreign_key="users.id", index=True
    )


class DonationResponse(SQLModel):
    """Schema for donation response."""

    id: uuid.UUID
    email: str
    name: Optional[str]
    amount: Decimal
    currency: str
    tx_ref: str
    created_at: str
