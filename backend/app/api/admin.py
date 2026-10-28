"""Platform administration routes for FoodX B2B marketplace."""

from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Any, Dict, Tuple

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from sqlalchemy import or_

from app.extensions import db
from app.models.delivery import Delivery
from app.models.order import (
    Order,
    OrderItem,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
)
from app.models.product import Category, Product
from app.models.user import User, UserRole
from app.models.vendor import Vendor
from app.models.wallet import Wallet, WalletTransaction
from app.utils.decorators import admin_required, vendor_required

admin_bp = Blueprint("admin", __name__)


def _parse_uuid(val: Any) -> uuid.UUID | None:
    """Safely parse input string or UUID object to uuid.UUID."""
    if isinstance(val, uuid.UUID):
        return val
    try:
        return uuid.UUID(str(val))
    except (ValueError, TypeError):
        return None


@admin_bp.route("/stats", methods=["GET"])
@jwt_required()
@admin_required
def get_dashboard_stats() -> Tuple[Any, int]:
    """Retrieve platform-wide high-level metrics and KPIs."""
    try:
        # Total users by role
        total_users = db.session.execute(db.select(db.func.count(User.id))).scalar() or 0
        total_retailers = db.session.execute(
            db.select(db.func.count(User.id)).where(User.role == UserRole.RETAILER)
        ).scalar() or 0
        total_vendors = db.session.execute(db.select(db.func.count(Vendor.id))).scalar() or 0

        # Orders metrics
        total_orders = db.session.execute(db.select(db.func.count(Order.id))).scalar() or 0
        pending_orders = db.session.execute(
            db.select(db.func.count(Order.id)).where(Order.order_status == OrderStatus.PENDING)
        ).scalar() or 0
        delivered_orders = db.session.execute(
            db.select(db.func.count(Order.id)).where(Order.order_status == OrderStatus.DELIVERED)
        ).scalar() or 0

        # Total platform revenue (sum of non-cancelled order totals)
        revenue_stmt = (
            db.select(db.func.coalesce(db.func.sum(Order.total), 0))
            .where(Order.order_status != OrderStatus.CANCELLED)
        )
        total_revenue = db.session.execute(revenue_stmt).scalar() or 0

        # Total products count
        total_products = db.session.execute(
            db.select(db.func.count(Product.id)).where(Product.is_active == True)  # noqa: E712
        ).scalar() or 0

        return (
            jsonify(
                {
                    "message": "Platform statistics retrieved successfully",
                    "data": {
                        "users": {
                            "total": total_users,
                            "retailers": total_retailers,
                            "vendors": total_vendors,
                        },
                        "orders": {
                            "total": total_orders,
                            "pending": pending_orders,
                            "delivered": delivered_orders,
                        },
                        "revenue": {
                            "total_revenue": float(total_revenue),
                            "currency": "SDG",
                        },
                        "products": {
                            "active_listings": total_products,
                        },
                    },
                }
            ),
            200,
        )
    except Exception as exc:
        return jsonify({"error": f"Failed to calculate stats: {str(exc)}"}), 500


@admin_bp.route("/users", methods=["GET"])
@jwt_required()
@admin_required
def list_users() -> Tuple[Any, int]:
    """List all registered users with pagination, role filtering, and search."""
    try:
        page = max(1, request.args.get("page", default=1, type=int))
        per_page = min(100, max(1, request.args.get("per_page", default=20, type=int)))
        role_filter = request.args.get("role")
        search_query = request.args.get("search", "").strip()

        stmt = db.select(User)

        if role_filter:
            try:
                role_enum = UserRole(role_filter.lower())
                stmt = stmt.where(User.role == role_enum)
            except ValueError:
                return (
                    jsonify(
                        {
                            "error": f"Invalid role '{role_filter}'. Valid roles: {', '.join(r.value for r in UserRole)}"
                        }
                    ),
                    400,
                )

        if search_query:
            search_pat = f"%{search_query}%"
            stmt = stmt.where(
                or_(
                    User.phone.ilike(search_pat),
                    User.full_name.ilike(search_pat),
                    User.email.ilike(search_pat),
                )
            )

        active_filter = request.args.get("is_active")
        if active_filter is not None:
            stmt = stmt.where(User.is_active == (active_filter.lower() in ("true", "1")))

        count_stmt = db.select(db.func.count()).select_from(stmt.subquery())
        total = db.session.execute(count_stmt).scalar() or 0

        paginated_stmt = (
            stmt.order_by(User.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
        users = db.session.execute(paginated_stmt).scalars().all()
        total_pages = (total + per_page - 1) // per_page if total > 0 else 1

        return (
            jsonify(
                {
                    "message": "Users retrieved successfully",
                    "data": {
                        "users": [u.to_dict() for u in users],
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
        return jsonify({"error": f"Failed to list users: {str(exc)}"}), 500


@admin_bp.route("/users/<string:user_id>/status", methods=["PUT"])
@jwt_required()
@admin_required
def update_user_status(user_id: str) -> Tuple[Any, int]:
    """Activate or deactivate a user account."""
    uid = _parse_uuid(user_id)
    if not uid:
        return jsonify({"error": "Invalid user ID format"}), 400

    current_admin_id = get_jwt_identity()
    if str(uid) == str(current_admin_id):
        return jsonify({"error": "Administrators cannot deactivate their own account"}), 400

    user = db.session.get(User, uid)
    if not user:
        return jsonify({"error": f"User '{user_id}' not found"}), 404

    payload = request.get_json(silent=True) or {}
    if "is_active" not in payload:
        return jsonify({"error": "Field 'is_active' (boolean) is required"}), 400

    is_active = bool(payload["is_active"])
    user.is_active = is_active

    try:
        db.session.commit()
        return (
            jsonify(
                {
                    "message": f"User account has been {'activated' if is_active else 'deactivated'}",
                    "data": user.to_dict(),
                }
            ),
            200,
        )
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Failed to update user status: {str(exc)}"}), 500


@admin_bp.route("/vendors", methods=["GET"])
@jwt_required()
@admin_required
def list_vendors() -> Tuple[Any, int]:
    """List all vendors with verification status and filtering."""
    try:
        page = max(1, request.args.get("page", default=1, type=int))
        per_page = min(100, max(1, request.args.get("per_page", default=20, type=int)))
        verified_filter = request.args.get("is_verified")
        search_query = request.args.get("search", "").strip()

        stmt = db.select(Vendor)

        if verified_filter is not None:
            is_v = verified_filter.lower() in ("true", "1")
            stmt = stmt.where(Vendor.is_verified == is_v)

        if search_query:
            search_pat = f"%{search_query}%"
            stmt = stmt.where(
                or_(
                    Vendor.business_name.ilike(search_pat),
                    Vendor.business_name_ar.ilike(search_pat),
                    Vendor.phone.ilike(search_pat),
                )
            )

        count_stmt = db.select(db.func.count()).select_from(stmt.subquery())
        total = db.session.execute(count_stmt).scalar() or 0

        paginated_stmt = (
            stmt.order_by(Vendor.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
        vendors = db.session.execute(paginated_stmt).scalars().all()
        total_pages = (total + per_page - 1) // per_page if total > 0 else 1

        return (
            jsonify(
                {
                    "message": "Vendors retrieved successfully",
                    "data": {
                        "vendors": [v.to_dict() for v in vendors],
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
        return jsonify({"error": f"Failed to list vendors: {str(exc)}"}), 500


@admin_bp.route("/vendors/<string:vendor_id>/verify", methods=["PUT"])
@jwt_required()
@admin_required
def verify_vendor(vendor_id: str) -> Tuple[Any, int]:
    """Verify or unverify a vendor account."""
    vid = _parse_uuid(vendor_id)
    if not vid:
        return jsonify({"error": "Invalid vendor ID format"}), 400

    vendor = db.session.get(Vendor, vid)
    if not vendor:
        return jsonify({"error": f"Vendor '{vendor_id}' not found"}), 404

    payload = request.get_json(silent=True) or {}
    is_verified = payload.get("is_verified", True)
    vendor.is_verified = bool(is_verified)

    try:
        db.session.commit()
        status_text = "verified" if vendor.is_verified else "unverified"
        return (
            jsonify(
                {
                    "message": f"Vendor has been {status_text} successfully",
                    "data": vendor.to_dict(),
                }
            ),
            200,
        )
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Failed to update vendor verification: {str(exc)}"}), 500


@admin_bp.route("/orders", methods=["GET"])
@jwt_required()
@admin_required
def list_all_orders() -> Tuple[Any, int]:
    """List all orders on the platform with administrative filtering."""
    try:
        page = max(1, request.args.get("page", default=1, type=int))
        per_page = min(100, max(1, request.args.get("per_page", default=20, type=int)))

        stmt = db.select(Order)

        status_param = request.args.get("status")
        if status_param:
            try:
                stmt = stmt.where(Order.order_status == OrderStatus(status_param.lower()))
            except ValueError:
                return jsonify({"error": f"Invalid order status '{status_param}'"}), 400

        pm_param = request.args.get("payment_method")
        if pm_param:
            try:
                stmt = stmt.where(Order.payment_method == PaymentMethod(pm_param.lower()))
            except ValueError:
                return jsonify({"error": f"Invalid payment method '{pm_param}'"}), 400

        ps_param = request.args.get("payment_status")
        if ps_param:
            try:
                stmt = stmt.where(Order.payment_status == PaymentStatus(ps_param.lower()))
            except ValueError:
                return jsonify({"error": f"Invalid payment status '{ps_param}'"}), 400

        vendor_id_param = request.args.get("vendor_id")
        if vendor_id_param:
            vid = _parse_uuid(vendor_id_param)
            if vid:
                stmt = stmt.where(Order.vendor_id == vid)

        retailer_id_param = request.args.get("retailer_id")
        if retailer_id_param:
            rid = _parse_uuid(retailer_id_param)
            if rid:
                stmt = stmt.where(Order.retailer_id == rid)

        count_stmt = db.select(db.func.count()).select_from(stmt.subquery())
        total = db.session.execute(count_stmt).scalar() or 0

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
