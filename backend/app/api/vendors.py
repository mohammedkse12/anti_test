"""Vendor routes for FoodX B2B marketplace."""

from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Any, Dict, Tuple

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from sqlalchemy import or_

from app.extensions import db
from app.models.delivery import Delivery
from app.models.order import Order, OrderItem, OrderStatus, PaymentStatus
from app.models.product import Category, Product
from app.models.user import User
from app.models.vendor import Vendor
from app.models.wallet import Wallet, WalletTransaction
from app.utils.decorators import admin_required, vendor_required

vendors_bp = Blueprint("vendors", __name__)


def _parse_uuid(val: Any) -> uuid.UUID | None:
    """Safely parse input string or UUID object to uuid.UUID."""
    if isinstance(val, uuid.UUID):
        return val
    try:
        return uuid.UUID(str(val))
    except (ValueError, TypeError):
        return None


@vendors_bp.route("", methods=["GET"])
@vendors_bp.route("/", methods=["GET"])
def list_vendors() -> Tuple[Any, int]:
    """List all verified vendors on the platform with pagination and search."""
    try:
        lang = request.args.get("lang", "en")
        page = max(1, request.args.get("page", default=1, type=int))
        per_page = min(100, max(1, request.args.get("per_page", default=20, type=int)))
        search_query = request.args.get("search", "").strip()

        # By default only return verified vendors for public directory
        stmt = db.select(Vendor).where(Vendor.is_verified == True)  # noqa: E712

        if search_query:
            search_pat = f"%{search_query}%"
            stmt = stmt.where(
                or_(
                    Vendor.business_name.ilike(search_pat),
                    Vendor.business_name_ar.ilike(search_pat),
                )
            )

        count_stmt = db.select(db.func.count()).select_from(stmt.subquery())
        total = db.session.execute(count_stmt).scalar() or 0

        paginated_stmt = (
            stmt.order_by(Vendor.business_name.asc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
        vendors = db.session.execute(paginated_stmt).scalars().all()

        vendor_list = []
        for v in vendors:
            v_dict = v.to_dict(lang=lang)
            # Count active products
            prod_count = db.session.execute(
                db.select(db.func.count(Product.id)).where(
                    Product.vendor_id == v.id,
                    Product.is_active == True,  # noqa: E712
                )
            ).scalar() or 0
            v_dict["product_count"] = prod_count
            vendor_list.append(v_dict)

        total_pages = (total + per_page - 1) // per_page if total > 0 else 1

        return (
            jsonify(
                {
                    "message": "Vendors retrieved successfully",
                    "data": {
                        "vendors": vendor_list,
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
        return jsonify({"error": f"Failed to retrieve vendors: {str(exc)}"}), 500


@vendors_bp.route("/profile", methods=["PUT"])
@jwt_required()
@vendor_required
def update_vendor_profile() -> Tuple[Any, int]:
    """Update profile information for the authenticated vendor."""
    user_id = get_jwt_identity()
    uid = _parse_uuid(user_id)
    if not uid:
        return jsonify({"error": "Invalid user identity"}), 401

    vendor_stmt = db.select(Vendor).where(Vendor.user_id == uid)
    vendor = db.session.execute(vendor_stmt).scalar_one_or_none()

    if not vendor:
        return jsonify({"error": "Vendor profile not found for this user"}), 404

    payload = request.get_json(silent=True) or {}

    if "business_name" in payload:
        b_name = payload["business_name"].strip()
        if not b_name:
            return jsonify({"error": "business_name cannot be empty"}), 400
        vendor.business_name = b_name

    if "business_name_ar" in payload:
        b_name_ar = payload["business_name_ar"].strip()
        if not b_name_ar:
            return jsonify({"error": "business_name_ar cannot be empty"}), 400
        vendor.business_name_ar = b_name_ar

    if "logo_url" in payload:
        vendor.logo_url = payload["logo_url"]

    if "description" in payload:
        vendor.description = payload["description"]

    if "description_ar" in payload:
        vendor.description_ar = payload["description_ar"]

    if "phone" in payload:
        vendor.phone = payload["phone"]

    if "address" in payload:
        vendor.address = payload["address"]

    try:
        db.session.commit()
        return (
            jsonify(
                {
                    "message": "Vendor profile updated successfully",
                    "data": vendor.to_dict(),
                }
            ),
            200,
        )
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Failed to update profile: {str(exc)}"}), 500


@vendors_bp.route("/dashboard", methods=["GET"])
@jwt_required()
@vendor_required
def get_vendor_dashboard() -> Tuple[Any, int]:
    """Retrieve operational dashboard statistics for the authenticated vendor."""
    try:
        user_id = get_jwt_identity()
        uid = _parse_uuid(user_id)
        if not uid:
            return jsonify({"error": "Invalid user identity"}), 401

        vendor_stmt = db.select(Vendor).where(Vendor.user_id == uid)
        vendor = db.session.execute(vendor_stmt).scalar_one_or_none()

        if not vendor:
            return jsonify({"error": "Vendor profile not found for this user"}), 404

        # Products count
        total_products = db.session.execute(
            db.select(db.func.count(Product.id)).where(
                Product.vendor_id == vendor.id,
                Product.is_active == True,  # noqa: E712
            )
        ).scalar() or 0

        # Orders count
        total_orders = db.session.execute(
            db.select(db.func.count(Order.id)).where(Order.vendor_id == vendor.id)
        ).scalar() or 0

        # Pending orders
        pending_orders = db.session.execute(
            db.select(db.func.count(Order.id)).where(
                Order.vendor_id == vendor.id,
                Order.order_status == OrderStatus.PENDING,
            )
        ).scalar() or 0

        # Revenue from completed orders
        revenue_stmt = (
            db.select(db.func.coalesce(db.func.sum(Order.total), 0))
            .where(
                Order.vendor_id == vendor.id,
                Order.order_status != OrderStatus.CANCELLED,
            )
        )
        total_revenue = db.session.execute(revenue_stmt).scalar() or 0

        # 5 most recent orders
        recent_orders_stmt = (
            db.select(Order)
            .where(Order.vendor_id == vendor.id)
            .order_by(Order.created_at.desc())
            .limit(5)
        )
        recent_orders = db.session.execute(recent_orders_stmt).scalars().all()

        return (
            jsonify(
                {
                    "message": "Vendor dashboard retrieved successfully",
                    "data": {
                        "vendor": vendor.to_dict(),
                        "stats": {
                            "total_products": total_products,
                            "total_orders": total_orders,
                            "pending_orders": pending_orders,
                            "total_revenue": float(total_revenue),
                            "currency": "SDG",
                        },
                        "recent_orders": [o.to_dict(include_items=False) for o in recent_orders],
                    },
                }
            ),
            200,
        )
    except Exception as exc:
        return jsonify({"error": f"Failed to load vendor dashboard: {str(exc)}"}), 500


@vendors_bp.route("/<string:vendor_id>", methods=["GET"])
def get_vendor(vendor_id: str) -> Tuple[Any, int]:
    """Retrieve public vendor profile including product catalog count."""
    vid = _parse_uuid(vendor_id)
    if not vid:
        return jsonify({"error": "Invalid vendor ID format"}), 400

    lang = request.args.get("lang", "en")
    vendor = db.session.get(Vendor, vid)

    if not vendor:
        return jsonify({"error": f"Vendor '{vendor_id}' not found"}), 404

    prod_count = db.session.execute(
        db.select(db.func.count(Product.id)).where(
            Product.vendor_id == vendor.id,
            Product.is_active == True,  # noqa: E712
        )
    ).scalar() or 0

    data = vendor.to_dict(lang=lang)
    data["product_count"] = prod_count

    return (
        jsonify(
            {
                "message": "Vendor retrieved successfully",
                "data": data,
            }
        ),
        200,
    )
