"""Wallet and WalletTransaction models for FoodX B2B marketplace."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    DateTime,
    Enum as SA_Enum,
    ForeignKey,
    Numeric,
    String,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import db

if TYPE_CHECKING:
    from app.models.order import Order
    from app.models.user import User


class TransactionType(str, enum.Enum):
    """Wallet transaction direction."""

    CREDIT = "credit"  # Funds added to wallet
    DEBIT = "debit"    # Funds deducted from wallet


class TransactionSource(str, enum.Enum):
    """Source or reason for wallet balance adjustment."""

    TOPUP = "topup"      # Top-up via bank transfer / Bankak / cash
    PAYMENT = "payment"  # Payment for an order
    REFUND = "refund"    # Order cancellation refund


class Wallet(db.Model):
    """Digital wallet entity owned by a user (retailer or vendor)."""

    __tablename__ = "wallets"

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
    balance: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=Decimal("0.00"),
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
        back_populates="wallet",
    )
    transactions: Mapped[list[WalletTransaction]] = relationship(
        "WalletTransaction",
        back_populates="wallet",
        cascade="all, delete-orphan",
        order_by="desc(WalletTransaction.created_at)",
    )

    def to_dict(self) -> dict:
        """Serialize wallet entity to dictionary."""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "balance": float(self.balance) if self.balance is not None else 0.0,
            "currency": "SDG",
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self) -> str:
        return f"<Wallet id={self.id} user_id={self.user_id} balance={self.balance} SDG>"


class WalletTransaction(db.Model):
    """Immutable ledger record representing money movements in a wallet."""

    __tablename__ = "wallet_transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    wallet_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("wallets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    order_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid,
        ForeignKey("orders.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    type: Mapped[TransactionType] = mapped_column(
        SA_Enum(TransactionType, native_enum=False, length=20),
        nullable=False,
    )
    source: Mapped[TransactionSource] = mapped_column(
        SA_Enum(TransactionSource, native_enum=False, length=20),
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )
    balance_after: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )
    reference: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
    )
    description: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    wallet: Mapped[Wallet] = relationship(
        "Wallet",
        back_populates="transactions",
    )
    order: Mapped[Optional[Order]] = relationship(
        "Order",
        back_populates="wallet_transactions",
    )

    def to_dict(self) -> dict:
        """Serialize transaction entity to dictionary."""
        return {
            "id": str(self.id),
            "wallet_id": str(self.wallet_id),
            "order_id": str(self.order_id) if self.order_id else None,
            "type": self.type.value if isinstance(self.type, enum.Enum) else str(self.type),
            "source": self.source.value if isinstance(self.source, enum.Enum) else str(self.source),
            "amount": float(self.amount) if self.amount is not None else 0.0,
            "balance_after": float(self.balance_after) if self.balance_after is not None else 0.0,
            "currency": "SDG",
            "reference": self.reference,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f"<WalletTransaction id={self.id} type={self.type} amount={self.amount} SDG>"
