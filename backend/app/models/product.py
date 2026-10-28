"""Product and Category models for FoodX B2B marketplace."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db

if TYPE_CHECKING:
    from app.models.order import OrderItem
    from app.models.vendor import Vendor


class Category(db.Model):
    """Product Category entity supporting hierarchical subcategories."""

    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    name_en: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    name_ar: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    icon: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    slug: Mapped[str] = mapped_column(
        String(120),
        unique=True,
        nullable=False,
        index=True,
    )
    parent_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
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

    # Hierarchical self-referential relationships
    parent: Mapped[Optional[Category]] = relationship(
        "Category",
        back_populates="children",
        remote_side=[id],
    )
    children: Mapped[list[Category]] = relationship(
        "Category",
        back_populates="parent",
        cascade="all, delete-orphan",
    )
    products: Mapped[list[Product]] = relationship(
        "Product",
        back_populates="category",
    )

    def to_dict(self, lang: str = "en", include_children: bool = True) -> dict:
        """Serialize category to dictionary with localization support.

        Args:
            lang: Language code ('en' or 'ar').
            include_children: Whether to nest direct subcategories.

        Returns:
            Dictionary representation of category.
        """
        data = {
            "id": self.id,
            "name_en": self.name_en,
            "name_ar": self.name_ar,
            "name": self.name_ar if lang == "ar" else self.name_en,
            "icon": self.icon,
            "slug": self.slug,
            "parent_id": self.parent_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_children and self.children:
            data["children"] = [
                child.to_dict(lang=lang, include_children=False)
                for child in self.children
            ]
        return data

    def __repr__(self) -> str:
        return f"<Category id={self.id} slug='{self.slug}'>"


class Product(db.Model):
    """Product entity for wholesale and grocery items."""

    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("vendors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    name_en: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )
    name_ar: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )
    description_en: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    description_ar: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )
    unit: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="piece",
    )
    min_order_qty: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )
    stock_qty: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    image_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
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
    vendor: Mapped[Vendor] = relationship(
        "Vendor",
        back_populates="products",
    )
    category: Mapped[Category] = relationship(
        "Category",
        back_populates="products",
    )
    order_items: Mapped[list[OrderItem]] = relationship(
        "OrderItem",
        back_populates="product",
    )

    def to_dict(self, lang: str = "en") -> dict:
        """Serialize product to dictionary with localization support.

        Args:
            lang: Language code ('en' or 'ar').

        Returns:
            Dictionary representation of product.
        """
        return {
            "id": str(self.id),
            "vendor_id": str(self.vendor_id),
            "category_id": self.category_id,
            "name_en": self.name_en,
            "name_ar": self.name_ar,
            "name": self.name_ar if lang == "ar" else self.name_en,
            "description_en": self.description_en,
            "description_ar": self.description_ar,
            "description": (
                self.description_ar if lang == "ar" else (self.description_en or self.description_ar)
            ),
            "price": float(self.price) if self.price is not None else 0.0,
            "currency": "SDG",
            "unit": self.unit,
            "min_order_qty": self.min_order_qty,
            "stock_qty": self.stock_qty,
            "image_url": self.image_url,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return f"<Product id={self.id} name='{self.name_en}' price={self.price} SDG>"
