"""Order management routes for FoodX B2B marketplace."""

from __future__ import annotations

import uuid
from typing import Any, Dict, Tuple

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.extensions import db
from app.models.delivery import Delivery
from app.models.order import Order, OrderItem, OrderStatus, PaymentMethod
from app.models.product import Category, Product
from app.models.user import User
from app.models.vendor import Vendor
from app.models.wallet import Wallet, WalletTransaction
from app.services.order_service import OrderService
from app.utils.decorators import admin_required, vendor_required

orders_bp = Blueprint("orders", __name__)


def _parse_uuid(val: Any) -> uuid.UUID | None:
    """Safely parse input string or UUID object to uuid.UUID."""
    if isinstance(val, uuid.UUID):
        return val
    try:
        return uuid.UUID(str(val))
    except (ValueError, TypeError):
        return None


@orders_bp.route("", methods=["POST"])
@orders_bp.route("/", methods=["POST"])
@jwt_required()
def place_order() -> Tuple[Any, int]:
    """Place wholesale orders from current user's shopping cart.

    Groups cart items by vendor, creates an individual Order per vendor,
    handles wallet deduction atomically, adjusts stock, and clears the cart.
    """
    user_id = get_jwt_identity()
    uid = _parse_uuid(user_id)
    if not uid:
        return jsonify({"error": "Invalid user identity"}), 401

    payload = request.get_json(silent=True) or {}

    try:
        created_orders = OrderService.create_order(user_id=uid, data=payload)
        return (
            jsonify(
                {
                    "message": "Order(s) placed successfully",
                    "data": {
                        "orders": [o.to_dict(include_items=True) for o in created_orders],
                        "order_count": len(created_orders),
                    },
                }
            ),
            201,
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"Failed to place order: {str(exc)}"}), 500


@orders_bp.route("", methods=["GET"])
@orders_bp.route("/", methods=["GET"])
@jwt_required()
def list_orders() -> Tuple[Any, int]:
    """List orders for the authenticated user.

    Retailers view orders they placed.
    Vendors view orders received for their inventory.
    Platform administrators can view all orders.
    Supports status filtering and pagination.
    """
    try:
        user_id = get_jwt_identity()
        uid = _parse_uuid(user_id)
        if not uid:
            return jsonify({"error": "Invalid user identity"}), 401

        claims = get_jwt()
        role = claims.get("role", "retailer")

        page = max(1, request.args.get("page", default=1, type=int))
        per_page = min(100, max(1, request.args.get("per_page", default=20, type=int)))
        status_filter = request.args.get("status")

        stmt = db.select(Order)

        # Role-based scoping
        if role == "vendor":
            vendor_stmt = db.select(Vendor).where(Vendor.user_id == uid)
            vendor = db.session.execute(vendor_stmt).scalar_one_or_none()
            if not vendor:
                return (
                    jsonify(
                        {
                            "message": "Orders retrieved",
                            "data": {"orders": [], "pagination": {"page": 1, "per_page": per_page, "total": 0, "total_pages": 1}},
                        }
                    ),
                    200,
                )
            stmt = stmt.where(Order.vendor_id == vendor.id)

        elif role == "admin":
            # Admin can filter by specific vendor or retailer
            filter_vendor = request.args.get("vendor_id")
            if filter_vendor:
                fv_uuid = _parse_uuid(filter_vendor)
                if fv_uuid:
                    stmt = stmt.where(Order.vendor_id == fv_uuid)

            filter_retailer = request.args.get("retailer_id")
            if filter_retailer:
                fr_uuid = _parse_uuid(filter_retailer)
                if fr_uuid:
                    stmt = stmt.where(Order.retailer_id == fr_uuid)

        else:
            # Default: Retailer sees their own orders
            stmt = stmt.where(Order.retailer_id == uid)

        # Status filter
        if status_filter:
            try:
                status_enum = OrderStatus(status_filter.lower())
                stmt = stmt.where(Order.order_status == status_enum)
            except ValueError:
                return (
                    jsonify(
                        {
                            "error": f"Invalid status '{status_filter}'. Valid choices: {', '.join(s.value for s in OrderStatus)}"
                        }
                    ),
                    400,
                )

        # Total count
        count_stmt = db.select(db.func.count()).select_from(stmt.subquery())
        total = db.session.execute(count_stmt).scalar() or 0

        # Paginated fetch
        paginated_stmt = (
            stmt.order_by(Order.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
        orders = db.session.execute(paginated_stmt).scalars().all()
        total_pages = (total + per_page - 1) // per_page if total > 0 else 1

        return (
            jsonify(
                {
                    "message": "Orders retrieved successfully",
                    "data": {
                        "orders": [o.to_dict(include_items=True) for o in orders],
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
        return jsonify({"error": f"Failed to list orders: {str(exc)}"}), 500


@orders_bp.route("/<string:order_id>", methods=["GET"])
@jwt_required()
def get_order(order_id: str) -> Tuple[Any, int]:
    """Retrieve full details for an order including line items and fulfillment status."""
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

    # Permission check
    if role != "admin":
        if role == "vendor":
            vendor = db.session.execute(
                db.select(Vendor).where(Vendor.user_id == uid)
            ).scalar_one_or_none()
            if not vendor or order.vendor_id != vendor.id:
                return jsonify({"error": "Unauthorized: Access denied to this order"}), 403
        else:
            if order.retailer_id != uid:
                return jsonify({"error": "Unauthorized: Access denied to this order"}), 403

    order_data = order.to_dict(include_items=True)

    # Attach vendor and retailer summaries
    if order.vendor:
        order_data["vendor"] = {
            "id": str(order.vendor.id),
            "business_name": order.vendor.business_name,
            "business_name_ar": order.vendor.business_name_ar,
            "phone": order.vendor.phone,
        }
    if order.retailer:
        order_data["retailer"] = {
            "id": str(order.retailer.id),
            "full_name": order.retailer.full_name,
            "phone": order.retailer.phone,
            "city": order.retailer.city,
            "address": order.retailer.address,
        }
    if order.delivery:
        order_data["delivery"] = order.delivery.to_dict()

    return (
        jsonify(
            {
                "message": "Order retrieved successfully",
                "data": order_data,
            }
        ),
        200,
    )


@orders_bp.route("/<string:order_id>/status", methods=["PUT"])
@jwt_required()
def update_order_status(order_id: str) -> Tuple[Any, int]:
    """Update order fulfillment status (vendor or platform admin).

    Allowed transitions: pending -> confirmed -> preparing -> shipped -> delivered.
    Allows cancellation if not yet delivered.
    """
    oid = _parse_uuid(order_id)
    if not oid:
        return jsonify({"error": "Invalid order ID format"}), 400

    user_id = get_jwt_identity()
    uid = _parse_uuid(user_id)
    claims = get_jwt()
    role = claims.get("role", "retailer")

    if role not in ("vendor", "admin"):
        return jsonify({"error": "Only vendors and administrators can update order status"}), 403

    payload = request.get_json(silent=True) or {}
    new_status = payload.get("status")

    if not new_status:
        return jsonify({"error": "Field 'status' is required"}), 400

    try:
        updated_order = OrderService.update_order_status(
            order_id=oid,
            new_status=new_status,
            user_id=uid,
            is_admin=(role == "admin"),
        )
        return (
            jsonify(
                {
                    "message": f"Order status updated to '{updated_order.order_status.value}'",
                    "data": updated_order.to_dict(include_items=True),
                }
            ),
            200,
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": f"Failed to update order status: {str(exc)}"}), 500
