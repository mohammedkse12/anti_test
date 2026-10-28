"""Order and OrderItem models for FoodX B2B marketplace."""

from __future__ import annotations

import enum
import secrets
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    DateTime,
    Enum as SA_Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db

if TYPE_CHECKING:
    from app.models.delivery import Delivery
    from app.models.product import Product
    from app.models.user import User
    from app.models.vendor import Vendor
    from app.models.wallet import WalletTransaction


class PaymentMethod(str, enum.Enum):
    """Supported payment methods in FoodX Sudan."""

    COD = "cod"          # Cash on Delivery
    BANKAK = "bankak"    # Bank of Khartoum (Bankak) transfer
    WALLET = "wallet"    # FoodX digital wallet


class PaymentStatus(str, enum.Enum):
    """Payment status lifecycle."""

    PENDING = "pending"
    PAID = "paid"
    REFUNDED = "refunded"


class OrderStatus(str, enum.Enum):
    """Order fulfillment status workflow."""

    PENDING = "pending"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


def generate_order_number() -> str:
    """Generate unique order reference code: FX-YYYYMMDD-XXXX."""
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    random_suffix = secrets.token_hex(2).upper()
    return f"FX-{date_str}-{random_suffix}"


class Order(db.Model):
    """Order placed by retailer to vendor."""

    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    order_number: Mapped[str] = mapped_column(
        String(32),
        unique=True,
        nullable=False,
        index=True,
        default=generate_order_number,
    )
    retailer_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("vendors.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=Decimal("0.00"),
    )
    delivery_fee: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=Decimal("0.00"),
    )
    total: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=Decimal("0.00"),
    )
    payment_method: Mapped[PaymentMethod] = mapped_column(
        SA_Enum(PaymentMethod, native_enum=False, length=20),
        nullable=False,
    )
    payment_status: Mapped[PaymentStatus] = mapped_column(
        SA_Enum(PaymentStatus, native_enum=False, length=20),
        default=PaymentStatus.PENDING,
        nullable=False,
    )
    order_status: Mapped[OrderStatus] = mapped_column(
        SA_Enum(OrderStatus, native_enum=False, length=20),
        default=OrderStatus.PENDING,
        nullable=False,
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
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
    retailer: Mapped[User] = relationship(
        "User",
        back_populates="orders",
        foreign_keys=[retailer_id],
    )
    vendor: Mapped[Vendor] = relationship(
        "Vendor",
        back_populates="orders",
        foreign_keys=[vendor_id],
    )
    items: Mapped[list[OrderItem]] = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
    )
    delivery: Mapped[Optional[Delivery]] = relationship(
        "Delivery",
        back_populates="order",
        uselist=False,
        cascade="all, delete-orphan",
    )
    wallet_transactions: Mapped[list[WalletTransaction]] = relationship(
        "WalletTransaction",
        back_populates="order",
    )

    def __init__(self, **kwargs):
        if "order_number" not in kwargs or not kwargs["order_number"]:
            kwargs["order_number"] = generate_order_number()
        super().__init__(**kwargs)

    def to_dict(self, include_items: bool = True) -> dict:
        """Serialize order entity to dictionary.

        Args:
            include_items: Whether to include nested order line items.

        Returns:
            Dictionary representation of order.
        """
        data = {
            "id": str(self.id),
            "order_number": self.order_number,
            "retailer_id": str(self.retailer_id),
            "vendor_id": str(self.vendor_id),
            "subtotal": float(self.subtotal) if self.subtotal is not None else 0.0,
            "delivery_fee": float(self.delivery_fee) if self.delivery_fee is not None else 0.0,
            "total": float(self.total) if self.total is not None else 0.0,
            "payment_method": (
                self.payment_method.value
                if isinstance(self.payment_method, enum.Enum)
                else str(self.payment_method)
            ),
            "payment_status": (
                self.payment_status.value
                if isinstance(self.payment_status, enum.Enum)
                else str(self.payment_status)
            ),
            "order_status": (
                self.order_status.value
                if isinstance(self.order_status, enum.Enum)
                else str(self.order_status)
            ),
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_items and self.items:
            data["items"] = [item.to_dict() for item in self.items]
        return data

    def __repr__(self) -> str:
        return f"<Order id={self.id} number='{self.order_number}' status={self.order_status}>"


class OrderItem(db.Model):
    """Line item in an order representing a purchased product."""

    __tablename__ = "order_items"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )
    total_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    # Relationships
    order: Mapped[Order] = relationship(
        "Order",
        back_populates="items",
    )
    product: Mapped[Product] = relationship(
        "Product",
        back_populates="order_items",
    )

    def to_dict(self) -> dict:
        """Serialize order item to dictionary."""
        return {
            "id": str(self.id),
            "order_id": str(self.order_id),
            "product_id": str(self.product_id),
            "quantity": self.quantity,
            "unit_price": float(self.unit_price) if self.unit_price is not None else 0.0,
            "total_price": float(self.total_price) if self.total_price is not None else 0.0,
        }

    def __repr__(self) -> str:
        return f"<OrderItem id={self.id} product_id={self.product_id} qty={self.quantity}>"
