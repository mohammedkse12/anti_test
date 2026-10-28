"""Delivery model for FoodX B2B marketplace order fulfillment."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    DateTime,
    Enum as SA_Enum,
    ForeignKey,
    String,
    Text,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db

if TYPE_CHECKING:
    from app.models.order import Order


class DeliveryStatus(str, enum.Enum):
    """Delivery lifecycle status."""

    PENDING = "pending"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    FAILED = "failed"


class Delivery(db.Model):
    """Delivery dispatch and status tracking for an order."""

    __tablename__ = "deliveries"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("orders.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    status: Mapped[DeliveryStatus] = mapped_column(
        SA_Enum(DeliveryStatus, native_enum=False, length=20),
        default=DeliveryStatus.PENDING,
        nullable=False,
    )
    driver_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    driver_phone: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
    )
    delivery_notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    estimated_delivery: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    delivered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
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
    order: Mapped[Order] = relationship(
        "Order",
        back_populates="delivery",
    )

    def to_dict(self) -> dict:
        """Serialize delivery entity to dictionary."""
        return {
            "id": str(self.id),
            "order_id": str(self.order_id),
            "status": self.status.value if isinstance(self.status, enum.Enum) else str(self.status),
            "driver_name": self.driver_name,
            "driver_phone": self.driver_phone,
            "delivery_notes": self.delivery_notes,
            "estimated_delivery": self.estimated_delivery.isoformat() if self.estimated_delivery else None,
            "delivered_at": self.delivered_at.isoformat() if self.delivered_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return f"<Delivery id={self.id} order_id={self.order_id} status={self.status}>"
