"""Digital wallet routes for FoodX B2B marketplace."""

from __future__ import annotations

import os
import uuid
from decimal import Decimal
from typing import Any, Dict, Tuple

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.extensions import db
from app.models.delivery import Delivery
from app.models.order import Order, OrderItem
from app.models.product import Category, Product
from app.models.user import User
from app.models.vendor import Vendor
from app.models.wallet import (
    TransactionSource,
    TransactionType,
    Wallet,
    WalletTransaction,
)
from app.services.wallet_service import WalletService
from app.utils.decorators import admin_required, vendor_required

wallet_bp = Blueprint("wallet", __name__)


def _parse_uuid(val: Any) -> uuid.UUID | None:
    """Safely parse input string or UUID object to uuid.UUID."""
    if isinstance(val, uuid.UUID):
        return val
    try:
        return uuid.UUID(str(val))
    except (ValueError, TypeError):
        return None


@wallet_bp.route("", methods=["GET"])
@wallet_bp.route("/", methods=["GET"])
@jwt_required()
def get_wallet() -> Tuple[Any, int]:
    """Retrieve current authenticated user's wallet balance."""
    try:
        user_id = get_jwt_identity()
        uid = _parse_uuid(user_id)
        if not uid:
            return jsonify({"error": "Invalid user identity"}), 401

        wallet = WalletService.get_or_create_wallet(uid)
        return (
            jsonify(
                {
                    "message": "Wallet retrieved successfully",
                    "data": wallet.to_dict(),
                }
            ),
            200,
        )
    except Exception as exc:
        return jsonify({"error": f"Failed to retrieve wallet: {str(exc)}"}), 500


@wallet_bp.route("/topup", methods=["POST"])
@jwt_required()
def topup_wallet() -> Tuple[Any, int]:
    """Top up wallet balance with funds in SDG.

    In development mode or standard platform simulation, top-ups are automatically approved.
    In external production setups, accepts a bank transfer reference.
    """
    user_id = get_jwt_identity()
    uid = _parse_uuid(user_id)
    if not uid:
        return jsonify({"error": "Invalid user identity"}), 401

    payload = request.get_json(silent=True) or {}
    amount_raw = payload.get("amount")
    reference = payload.get("reference")
    description = payload.get("description")

    if amount_raw is None:
        return jsonify({"error": "Field 'amount' is required"}), 400

    try:
        amount = Decimal(str(amount_raw))
        if amount <= Decimal("0"):
            raise ValueError()
    except (ValueError, TypeError):
        return jsonify({"error": "Top-up amount must be a positive number"}), 400

    try:
        wallet, txn = WalletService.topup(
            user_id=uid,
            amount=amount,
            reference=reference,
            description=description,
        )
        return (
            jsonify(
                {
                    "message": f"Successfully credited {amount:.2f} SDG to wallet",
                    "data": {
                        "wallet": wallet.to_dict(),
                        "transaction": txn.to_dict(),
                    },
                }
            ),
            200,
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"Failed to process top-up: {str(exc)}"}), 500


@wallet_bp.route("/transactions", methods=["GET"])
@jwt_required()
def list_transactions() -> Tuple[Any, int]:
    """List wallet transaction history for the authenticated user with pagination."""
    try:
        user_id = get_jwt_identity()
        uid = _parse_uuid(user_id)
        if not uid:
            return jsonify({"error": "Invalid user identity"}), 401

        wallet = WalletService.get_or_create_wallet(uid)

        page = max(1, request.args.get("page", default=1, type=int))
        per_page = min(100, max(1, request.args.get("per_page", default=20, type=int)))
        txn_type = request.args.get("type")

        stmt = db.select(WalletTransaction).where(WalletTransaction.wallet_id == wallet.id)

        if txn_type:
            try:
                type_enum = TransactionType(txn_type.lower())
                stmt = stmt.where(WalletTransaction.type == type_enum)
            except ValueError:
                return (
                    jsonify(
                        {
                            "error": f"Invalid type '{txn_type}'. Valid: {', '.join(t.value for t in TransactionType)}"
                        }
                    ),
                    400,
                )

        count_stmt = db.select(db.func.count()).select_from(stmt.subquery())
        total = db.session.execute(count_stmt).scalar() or 0

        paginated_stmt = (
            stmt.order_by(WalletTransaction.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
        transactions = db.session.execute(paginated_stmt).scalars().all()
        total_pages = (total + per_page - 1) // per_page if total > 0 else 1

        return (
            jsonify(
                {
                    "message": "Transactions retrieved successfully",
                    "data": {
                        "transactions": [t.to_dict() for t in transactions],
                        "pagination": {
                            "page": page,
                            "per_page": per_page,
                            "total": total,
                            "total_pages": total_pages,
                        },
                    },
                }
            ),
            200,
        )
    except Exception as exc:
        return jsonify({"error": f"Failed to retrieve transactions: {str(exc)}"}), 500
