"""User model for FoodX B2B marketplace."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

import bcrypt
from sqlalchemy import Boolean, DateTime, Enum as SA_Enum, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db

if TYPE_CHECKING:
    from app.models.order import Order
    from app.models.vendor import Vendor
    from app.models.wallet import Wallet


class UserRole(str, enum.Enum):
    """User role enumeration."""

    ADMIN = "admin"
    VENDOR = "vendor"
    RETAILER = "retailer"


class User(db.Model):
    """User entity representing retailers, vendors, and platform admins."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )
    phone: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False,
        index=True,
    )
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    full_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    role: Mapped[UserRole] = mapped_column(
        SA_Enum(UserRole, native_enum=False, length=20),
        default=UserRole.RETAILER,
        nullable=False,
    )
    city: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    address: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    lang_pref: Mapped[str] = mapped_column(
        String(10),
        default="ar",
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    phone_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
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
    vendor: Mapped[Optional[Vendor]] = relationship(
        "Vendor",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    wallet: Mapped[Optional[Wallet]] = relationship(
        "Wallet",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    orders: Mapped[list[Order]] = relationship(
        "Order",
        back_populates="retailer",
        foreign_keys="Order.retailer_id",
        cascade="all, delete-orphan",
    )

    def set_password(self, password: str) -> None:
        """Hash and set user password using bcrypt.

        Args:
            password: Plain text password to hash.
        """
        if not password:
            raise ValueError("Password cannot be empty")
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    def check_password(self, password: str) -> bool:
        """Verify given password against stored bcrypt hash.

        Args:
            password: Plain text password to check.

        Returns:
            True if password matches, False otherwise.
        """
        if not self.password_hash or not password:
            return False
        try:
            return bcrypt.checkpw(
                password.encode("utf-8"),
                self.password_hash.encode("utf-8"),
            )
        except (ValueError, TypeError):
            return False

    def to_dict(self) -> dict:
        """Serialize user model to dictionary (excluding sensitive password hash).

        Returns:
            Dictionary containing user attributes.
        """
        return {
            "id": str(self.id),
            "email": self.email,
            "phone": self.phone,
            "full_name": self.full_name,
            "role": self.role.value if isinstance(self.role, enum.Enum) else str(self.role),
            "city": self.city,
            "address": self.address,
            "lang_pref": self.lang_pref,
            "is_active": self.is_active,
            "phone_verified": self.phone_verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return f"<User id={self.id} phone={self.phone} role={self.role}>"
