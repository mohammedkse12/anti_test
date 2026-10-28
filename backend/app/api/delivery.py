"""Delivery dispatch and fulfillment routes for FoodX B2B marketplace."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Tuple

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.extensions import db
from app.models.delivery import Delivery, DeliveryStatus
from app.models.order import (
    Order,
    OrderItem,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
)
from app.models.product import Category, Product
from app.models.user import User
from app.models.vendor import Vendor
from app.models.wallet import Wallet, WalletTransaction
from app.utils.decorators import admin_required, vendor_required

delivery_bp = Blueprint("delivery", __name__)


def _parse_uuid(val: Any) -> uuid.UUID | None:
    """Safely parse input string or UUID object to uuid.UUID."""
    if isinstance(val, uuid.UUID):
        return val
    try:
        return uuid.UUID(str(val))
    except (ValueError, TypeError):
        return None


@delivery_bp.route("/<string:order_id>", methods=["GET"])
@jwt_required()
def get_delivery_status(order_id: str) -> Tuple[Any, int]:
    """Retrieve delivery and dispatch tracking details for a specific order."""
    oid = _parse_uuid(order_id)
    if not oid:
        return jsonify({"error": "Invalid order ID format"}), 400

    user_id = get_jwt_identity()
    uid = _parse_uuid(user_id)
    claims = get_jwt()
    role = claims.get("role", "retailer")

    order = db.session.get(Order, oid)
    if not order:
        return jsonify({"error": f"Order '{order_id}' not found"}), 404

    # Access control
    if role != "admin":
        if role == "vendor":
            vendor = db.session.execute(
                db.select(Vendor).where(Vendor.user_id == uid)
            ).scalar_one_or_none()
            if not vendor or order.vendor_id != vendor.id:
                return jsonify({"error": "Unauthorized access to this order delivery"}), 403
        else:
            if order.retailer_id != uid:
                return jsonify({"error": "Unauthorized access to this order delivery"}), 403

    stmt = db.select(Delivery).where(Delivery.order_id == oid)
    delivery = db.session.execute(stmt).scalar_one_or_none()

    if not delivery:
        return jsonify({"error": "No delivery record initialized for this order"}), 404

    delivery_data = delivery.to_dict()
    delivery_data["order_number"] = order.order_number
    delivery_data["order_status"] = order.order_status.value

    return (
        jsonify(
            {
                "message": "Delivery status retrieved successfully",
                "data": delivery_data,
            }
        ),
        200,
    )


@delivery_bp.route("/<string:order_id>", methods=["PUT"])
@jwt_required()
@vendor_required
def update_delivery_status(order_id: str) -> Tuple[Any, int]:
    """Update delivery driver, dispatch notes, and fulfillment state (vendor only)."""
    oid = _parse_uuid(order_id)
    if not oid:
        return jsonify({"error": "Invalid order ID format"}), 400

    user_id = get_jwt_identity()
    uid = _parse_uuid(user_id)
    claims = get_jwt()
    role = claims.get("role", "vendor")

    order = db.session.get(Order, oid)
    if not order:
        return jsonify({"error": f"Order '{order_id}' not found"}), 404

    # Check vendor ownership if not admin
    if role != "admin":
        vendor = db.session.execute(
            db.select(Vendor).where(Vendor.user_id == uid)
        ).scalar_one_or_none()
        if not vendor or order.vendor_id != vendor.id:
            return jsonify({"error": "Unauthorized: You do not own this order's vendor"}), 403

    stmt = db.select(Delivery).where(Delivery.order_id == oid)
    delivery = db.session.execute(stmt).scalar_one_or_none()

    if not delivery:
        delivery = Delivery(order_id=oid, status=DeliveryStatus.PENDING)
        db.session.add(delivery)

    payload = request.get_json(silent=True) or {}

    if "driver_name" in payload:
        delivery.driver_name = payload["driver_name"]

    if "driver_phone" in payload:
        delivery.driver_phone = payload["driver_phone"]

    if "delivery_notes" in payload:
        delivery.delivery_notes = payload["delivery_notes"]

    if "estimated_delivery" in payload:
        est_val = payload["estimated_delivery"]
        if est_val:
            try:
                delivery.estimated_delivery = datetime.fromisoformat(est_val)
            except (ValueError, TypeError):
                return jsonify({"error": "Invalid ISO datetime format for estimated_delivery"}), 400
        else:
            delivery.estimated_delivery = None

    if "status" in payload:
        status_raw = payload["status"]
        try:
            target_status = DeliveryStatus(status_raw.lower())
            delivery.status = target_status

            if target_status == DeliveryStatus.DELIVERED:
                delivery.delivered_at = datetime.now(timezone.utc)
                order.order_status = OrderStatus.DELIVERED
                if order.payment_method == PaymentMethod.COD:
                    order.payment_status = PaymentStatus.PAID
            elif target_status == DeliveryStatus.IN_TRANSIT:
                order.order_status = OrderStatus.SHIPPED

        except ValueError:
            return (
                jsonify(
                    {
                        "error": f"Invalid delivery status '{status_raw}'. Valid: {', '.join(s.value for s in DeliveryStatus)}"
                    }
                ),
                400,
            )

    try:
        db.session.commit()
        return (
            jsonify(
                {
                    "message": "Delivery details updated successfully",
                    "data": delivery.to_dict(),
                }
            ),
            200,
        )
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Failed to update delivery: {str(exc)}"}), 500
