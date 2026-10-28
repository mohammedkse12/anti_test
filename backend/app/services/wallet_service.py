"""Wallet service for managing user balances, top-ups, deductions, and refunds."""

from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Optional, Tuple

from app.extensions import db
from app.models.wallet import (
    TransactionSource,
    TransactionType,
    Wallet,
    WalletTransaction,
)


def _to_uuid(val: str | uuid.UUID) -> uuid.UUID:
    """Helper to convert string or UUID to uuid.UUID instance."""
    if isinstance(val, uuid.UUID):
        return val
    return uuid.UUID(str(val))


class WalletService:
    """Business logic for FoodX digital wallet operations."""

    @staticmethod
    def get_or_create_wallet(user_id: str | uuid.UUID) -> Wallet:
        """Retrieve existing user wallet or automatically create one with 0 balance.

        Args:
            user_id: UUID of user.

        Returns:
            Wallet instance.
        """
        uid = _to_uuid(user_id)
        stmt = db.select(Wallet).where(Wallet.user_id == uid)
        wallet = db.session.execute(stmt).scalar_one_or_none()

        if wallet is None:
            wallet = Wallet(
                user_id=uid,
                balance=Decimal("0.00"),
            )
            db.session.add(wallet)
            db.session.commit()

        return wallet

    @staticmethod
    def topup(
        user_id: str | uuid.UUID,
        amount: Decimal | float | int | str,
        reference: Optional[str] = None,
        description: Optional[str] = None,
    ) -> Tuple[Wallet, WalletTransaction]:
        """Credit funds to user wallet with atomic update and ledger entry.

        Args:
            user_id: UUID of user.
            amount: Amount in SDG to credit (must be > 0).
            reference: Optional transaction reference (e.g. Bankak reference).
            description: Optional custom note.

        Returns:
            Tuple of (Wallet, WalletTransaction).

        Raises:
            ValueError: If amount is less than or equal to 0.
        """
        uid = _to_uuid(user_id)
        credit_amount = Decimal(str(amount))
        if credit_amount <= Decimal("0"):
            raise ValueError("Top-up amount must be greater than zero.")

        # Pessimistic row locking to prevent race conditions during balance update
        stmt = db.select(Wallet).where(Wallet.user_id == uid).with_for_update()
        wallet = db.session.execute(stmt).scalar_one_or_none()

        if wallet is None:
            wallet = Wallet(user_id=uid, balance=Decimal("0.00"))
            db.session.add(wallet)
            db.session.flush()

        new_balance = wallet.balance + credit_amount
        wallet.balance = new_balance

        txn_desc = description or f"Wallet top-up of {credit_amount:.2f} SDG"
        transaction = WalletTransaction(
            wallet_id=wallet.id,
            type=TransactionType.CREDIT,
            source=TransactionSource.TOPUP,
            amount=credit_amount,
            balance_after=new_balance,
            reference=reference,
            description=txn_desc,
        )
        db.session.add(transaction)
        db.session.commit()

        return wallet, transaction

    @staticmethod
    def deduct(
        user_id: str | uuid.UUID,
        amount: Decimal | float | int | str,
        order_id: Optional[str | uuid.UUID] = None,
        reference: Optional[str] = None,
        description: Optional[str] = None,
        commit: bool = True,
    ) -> Tuple[Wallet, WalletTransaction]:
        """Deduct funds from user wallet using row-level locking (SELECT FOR UPDATE).

        Args:
            user_id: UUID of user.
            amount: Amount in SDG to deduct (must be > 0).
            order_id: Optional UUID of related order.
            reference: Optional transaction reference.
            description: Optional description.
            commit: Whether to commit the transaction immediately (default True).

        Returns:
            Tuple of (Wallet, WalletTransaction).

        Raises:
            ValueError: If amount is non-positive or balance is insufficient.
        """
        uid = _to_uuid(user_id)
        debit_amount = Decimal(str(amount))
        if debit_amount <= Decimal("0"):
            raise ValueError("Deduction amount must be greater than zero.")

        # Row-level pessimistic locking
        stmt = db.select(Wallet).where(Wallet.user_id == uid).with_for_update()
        wallet = db.session.execute(stmt).scalar_one_or_none()

        if wallet is None:
            wallet = Wallet(user_id=uid, balance=Decimal("0.00"))
            db.session.add(wallet)
            db.session.flush()

        if wallet.balance < debit_amount:
            raise ValueError(
                f"Insufficient wallet balance. Current: {wallet.balance:.2f} SDG, required: {debit_amount:.2f} SDG."
            )

        new_balance = wallet.balance - debit_amount
        wallet.balance = new_balance

        oid = _to_uuid(order_id) if order_id else None
        txn_desc = description or f"Payment deduction of {debit_amount:.2f} SDG"
        transaction = WalletTransaction(
            wallet_id=wallet.id,
            order_id=oid,
            type=TransactionType.DEBIT,
            source=TransactionSource.PAYMENT,
            amount=debit_amount,
            balance_after=new_balance,
            reference=reference,
            description=txn_desc,
        )
        db.session.add(transaction)

        if commit:
            db.session.commit()
        else:
            db.session.flush()

        return wallet, transaction

    @staticmethod
    def refund(
        user_id: str | uuid.UUID,
        amount: Decimal | float | int | str,
        order_id: Optional[str | uuid.UUID] = None,
        reference: Optional[str] = None,
        description: Optional[str] = None,
        commit: bool = True,
    ) -> Tuple[Wallet, WalletTransaction]:
        """Refund funds to user wallet with pessimistic locking.

        Args:
            user_id: UUID of user.
            amount: Amount in SDG to refund.
            order_id: Optional UUID of related cancelled order.
            reference: Optional transaction reference.
            description: Optional description.
            commit: Whether to commit the transaction immediately (default True).

        Returns:
            Tuple of (Wallet, WalletTransaction).

        Raises:
            ValueError: If amount is non-positive.
        """
        uid = _to_uuid(user_id)
        refund_amount = Decimal(str(amount))
        if refund_amount <= Decimal("0"):
            raise ValueError("Refund amount must be greater than zero.")

        stmt = db.select(Wallet).where(Wallet.user_id == uid).with_for_update()
        wallet = db.session.execute(stmt).scalar_one_or_none()

        if wallet is None:
            wallet = Wallet(user_id=uid, balance=Decimal("0.00"))
            db.session.add(wallet)
            db.session.flush()

        new_balance = wallet.balance + refund_amount
        wallet.balance = new_balance

        oid = _to_uuid(order_id) if order_id else None
        txn_desc = description or f"Refund of {refund_amount:.2f} SDG"
        transaction = WalletTransaction(
            wallet_id=wallet.id,
            order_id=oid,
            type=TransactionType.CREDIT,
            source=TransactionSource.REFUND,
            amount=refund_amount,
            balance_after=new_balance,
            reference=reference,
            description=txn_desc,
        )
        db.session.add(transaction)

        if commit:
            db.session.commit()
        else:
            db.session.flush()

        return wallet, transaction
