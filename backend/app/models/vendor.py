"""Vendor model for FoodX B2B marketplace."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db

if TYPE_CHECKING:
    from app.models.order import Order
    from app.models.product import Product
    from app.models.user import User


class Vendor(db.Model):
    """Vendor entity representing wholesalers and distributors."""

    __tablename__ = "vendors"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    business_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )
    business_name_ar: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )
    logo_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    description_ar: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    phone: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
    )
    address: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    rating: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user: Mapped[User] = relationship(
        "User",
        back_populates="vendor",
    )
    products: Mapped[list[Product]] = relationship(
        "Product",
        back_populates="vendor",
        cascade="all, delete-orphan",
    )
    orders: Mapped[list[Order]] = relationship(
        "Order",
        back_populates="vendor",
        foreign_keys="Order.vendor_id",
    )

    def to_dict(self, lang: str = "en") -> dict:
        """Serialize vendor entity to dictionary.

        Args:
            lang: Language preference ('en' or 'ar') for localized name and description.

        Returns:
            Dictionary representation of vendor.
        """
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "business_name": self.business_name,
            "business_name_ar": self.business_name_ar,
            "name": self.business_name_ar if lang == "ar" else self.business_name,
            "logo_url": self.logo_url,
            "description": self.description,
            "description_ar": self.description_ar,
            "localized_description": (
                self.description_ar if lang == "ar" else (self.description or self.description_ar)
            ),
            "phone": self.phone,
            "address": self.address,
            "is_verified": self.is_verified,
            "rating": round(float(self.rating), 2) if self.rating is not None else 0.0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return f"<Vendor id={self.id} business_name='{self.business_name}'>"
