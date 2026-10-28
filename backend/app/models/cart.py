"""Shopping Cart model for FoodX B2B marketplace."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, Uuid, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db

if TYPE_CHECKING:
    from app.models.product import Product
    from app.models.user import User


class CartItem(db.Model):
    """CartItem representing a product and quantity in a user's server-side shopping cart."""

    __tablename__ = "cart_items"
    __table_args__ = (
        UniqueConstraint("user_id", "product_id", name="uq_user_product_cart"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    quantity: Mapped[int] = mapped_column(
        Integer,
        default=1,
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
    product: Mapped[Product] = relationship("Product", lazy="joined")
    user: Mapped[User] = relationship("User")

    def to_dict(self, lang: str = "en") -> dict:
        """Serialize cart item with product details and subtotal calculation."""
        product_dict = self.product.to_dict(lang=lang) if self.product else None
        item_price = float(self.product.price) if self.product and self.product.price else 0.0
        subtotal = round(item_price * self.quantity, 2)

        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "product_id": str(self.product_id),
            "quantity": self.quantity,
            "unit_price": item_price,
            "subtotal": subtotal,
            "product": product_dict,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return f"<CartItem id={self.id} user_id={self.user_id} product_id={self.product_id} qty={self.quantity}>"
