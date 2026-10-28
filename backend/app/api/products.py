"""Product & Category routes for FoodX B2B marketplace."""

from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Any, Dict, Tuple

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from sqlalchemy import or_

from app.extensions import db
from app.models.delivery import Delivery
from app.models.order import Order, OrderItem
from app.models.product import Category, Product
from app.models.user import User
from app.models.vendor import Vendor
from app.models.wallet import Wallet, WalletTransaction
from app.utils.decorators import admin_required, vendor_required

products_bp = Blueprint("products", __name__)


def _parse_uuid(val: Any) -> uuid.UUID | None:
    """Safely parse input string or UUID object to uuid.UUID."""
    if isinstance(val, uuid.UUID):
        return val
    try:
        return uuid.UUID(str(val))
    except (ValueError, TypeError):
        return None


@products_bp.route("", methods=["GET"])
@products_bp.route("/", methods=["GET"])
def list_products() -> Tuple[Any, int]:
    """List products with multi-attribute filtering and pagination.

    Query Parameters:
        category_id: int - Filter by product category ID.
        vendor_id: uuid - Filter by vendor ID.
        search: str - Search query for name_en or name_ar.
        min_price: float - Minimum unit price.
        max_price: float - Maximum unit price.
        is_active: bool - Filter active/inactive products (default: true).
        lang: str - Language preference ('en' or 'ar', default: 'en').
        page: int - Page number (default: 1).
        per_page: int - Items per page (default: 20, max: 100).
    """
    try:
        lang = request.args.get("lang", "en")
        page = max(1, request.args.get("page", default=1, type=int))
        per_page = min(100, max(1, request.args.get("per_page", default=20, type=int)))

        stmt = db.select(Product)

        # Active filter
        active_param = request.args.get("is_active")
        if active_param is not None:
            is_active_val = active_param.lower() in ("true", "1", "yes")
            stmt = stmt.where(Product.is_active == is_active_val)
        else:
            stmt = stmt.where(Product.is_active == True)  # noqa: E712

        # Category filter
        category_id = request.args.get("category_id", type=int)
        if category_id:
            stmt = stmt.where(Product.category_id == category_id)

        # Vendor filter
        vendor_id_str = request.args.get("vendor_id")
        if vendor_id_str:
            v_uuid = _parse_uuid(vendor_id_str)
            if v_uuid:
                stmt = stmt.where(Product.vendor_id == v_uuid)

        # Full-text search in English and Arabic names
        search_query = request.args.get("search", "").strip()
        if search_query:
            search_pattern = f"%{search_query}%"
            stmt = stmt.where(
                or_(
                    Product.name_en.ilike(search_pattern),
                    Product.name_ar.ilike(search_pattern),
                )
            )

        # Price range filters
        min_price = request.args.get("min_price", type=float)
        if min_price is not None:
            stmt = stmt.where(Product.price >= Decimal(str(min_price)))

        max_price = request.args.get("max_price", type=float)
        if max_price is not None:
            stmt = stmt.where(Product.price <= Decimal(str(max_price)))

        # Total count query
        count_stmt = db.select(db.func.count()).select_from(stmt.subquery())
        total = db.session.execute(count_stmt).scalar() or 0

        # Paginated fetch
        paginated_stmt = (
            stmt.order_by(Product.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
        products = db.session.execute(paginated_stmt).scalars().all()

        total_pages = (total + per_page - 1) // per_page if total > 0 else 1

        return (
            jsonify(
                {
                    "message": "Products retrieved successfully",
                    "data": {
                        "products": [p.to_dict(lang=lang) for p in products],
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
        return jsonify({"error": f"Failed to retrieve products: {str(exc)}"}), 500


@products_bp.route("/<string:product_id>", methods=["GET"])
def get_product(product_id: str) -> Tuple[Any, int]:
    """Retrieve details for a single product including its vendor information."""
    p_uuid = _parse_uuid(product_id)
    if not p_uuid:
        return jsonify({"error": "Invalid product ID format"}), 400

    lang = request.args.get("lang", "en")
    product = db.session.get(Product, p_uuid)

    if not product:
        return jsonify({"error": f"Product '{product_id}' not found"}), 404

    data = product.to_dict(lang=lang)
    if product.vendor:
        data["vendor"] = product.vendor.to_dict(lang=lang)
    if product.category:
        data["category"] = product.category.to_dict(lang=lang, include_children=False)

    return (
        jsonify(
            {
                "message": "Product retrieved successfully",
                "data": data,
            }
        ),
        200,
    )


@products_bp.route("", methods=["POST"])
@products_bp.route("/", methods=["POST"])
@jwt_required()
@vendor_required
def create_product() -> Tuple[Any, int]:
    """Create a new product listing (vendor only).

    The vendor_id is automatically associated with the authenticated vendor account.
    """
    user_id = get_jwt_identity()
    u_uuid = _parse_uuid(user_id)

    vendor_stmt = db.select(Vendor).where(Vendor.user_id == u_uuid)
    vendor = db.session.execute(vendor_stmt).scalar_one_or_none()

    if not vendor:
        return jsonify({"error": "No vendor profile associated with this account"}), 403

    payload = request.get_json(silent=True) or {}

    # Validate required attributes
    name_en = payload.get("name_en", "").strip()
    name_ar = payload.get("name_ar", "").strip()
    category_id = payload.get("category_id")
    price_raw = payload.get("price")

    if not name_en or not name_ar:
        return jsonify({"error": "Fields 'name_en' and 'name_ar' are required"}), 400

    if not category_id:
        return jsonify({"error": "Field 'category_id' is required"}), 400

    category = db.session.get(Category, category_id)
    if not category:
        return jsonify({"error": f"Category ID {category_id} does not exist"}), 400

    try:
        price = Decimal(str(price_raw))
        if price <= Decimal("0"):
            raise ValueError()
    except (ValueError, TypeError):
        return jsonify({"error": "Price must be a valid positive number"}), 400

    unit = payload.get("unit", "piece").strip() or "piece"
    min_order_qty = max(1, payload.get("min_order_qty", 1))
    stock_qty = max(0, payload.get("stock_qty", 0))
    image_url = payload.get("image_url")
    description_en = payload.get("description_en")
    description_ar = payload.get("description_ar")

    product = Product(
        vendor_id=vendor.id,
        category_id=category.id,
        name_en=name_en,
        name_ar=name_ar,
        description_en=description_en,
        description_ar=description_ar,
        price=price,
        unit=unit,
        min_order_qty=min_order_qty,
        stock_qty=stock_qty,
        image_url=image_url,
        is_active=payload.get("is_active", True),
    )

    try:
        db.session.add(product)
        db.session.commit()
        return (
            jsonify(
                {
                    "message": "Product created successfully",
                    "data": product.to_dict(),
                }
            ),
            201,
        )
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Failed to create product: {str(exc)}"}), 500


@products_bp.route("/<string:product_id>", methods=["PUT"])
@jwt_required()
@vendor_required
def update_product(product_id: str) -> Tuple[Any, int]:
    """Update an existing product listing (vendor must own the product)."""
    p_uuid = _parse_uuid(product_id)
    if not p_uuid:
        return jsonify({"error": "Invalid product ID format"}), 400

    product = db.session.get(Product, p_uuid)
    if not product:
        return jsonify({"error": f"Product '{product_id}' not found"}), 404

    # Verify ownership
    user_id = get_jwt_identity()
    u_uuid = _parse_uuid(user_id)
    vendor_stmt = db.select(Vendor).where(Vendor.user_id == u_uuid)
    vendor = db.session.execute(vendor_stmt).scalar_one_or_none()

    if not vendor or product.vendor_id != vendor.id:
        return jsonify({"error": "Unauthorized: You do not own this product listing"}), 403

    payload = request.get_json(silent=True) or {}

    if "name_en" in payload:
        name_en = payload["name_en"].strip()
        if not name_en:
            return jsonify({"error": "name_en cannot be empty"}), 400
        product.name_en = name_en

    if "name_ar" in payload:
        name_ar = payload["name_ar"].strip()
        if not name_ar:
            return jsonify({"error": "name_ar cannot be empty"}), 400
        product.name_ar = name_ar

    if "description_en" in payload:
        product.description_en = payload["description_en"]

    if "description_ar" in payload:
        product.description_ar = payload["description_ar"]

    if "price" in payload:
        try:
            p_val = Decimal(str(payload["price"]))
            if p_val <= Decimal("0"):
                raise ValueError()
            product.price = p_val
        except (ValueError, TypeError):
            return jsonify({"error": "Price must be a positive number"}), 400

    if "unit" in payload:
        product.unit = str(payload["unit"]).strip()

    if "min_order_qty" in payload:
        product.min_order_qty = max(1, int(payload["min_order_qty"]))

    if "stock_qty" in payload:
        product.stock_qty = max(0, int(payload["stock_qty"]))

    if "image_url" in payload:
        product.image_url = payload["image_url"]

    if "is_active" in payload:
        product.is_active = bool(payload["is_active"])

    if "category_id" in payload:
        cat = db.session.get(Category, payload["category_id"])
        if not cat:
            return jsonify({"error": f"Category ID {payload['category_id']} not found"}), 400
        product.category_id = cat.id

    try:
        db.session.commit()
        return (
            jsonify(
                {
                    "message": "Product updated successfully",
                    "data": product.to_dict(),
                }
            ),
            200,
        )
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Failed to update product: {str(exc)}"}), 500


@products_bp.route("/<string:product_id>", methods=["DELETE"])
@jwt_required()
@vendor_required
def delete_product(product_id: str) -> Tuple[Any, int]:
    """Soft delete / deactivate a product listing (vendor only)."""
    p_uuid = _parse_uuid(product_id)
    if not p_uuid:
        return jsonify({"error": "Invalid product ID format"}), 400

    product = db.session.get(Product, p_uuid)
    if not product:
        return jsonify({"error": f"Product '{product_id}' not found"}), 404

    # Verify ownership
    user_id = get_jwt_identity()
    u_uuid = _parse_uuid(user_id)
    vendor_stmt = db.select(Vendor).where(Vendor.user_id == u_uuid)
    vendor = db.session.execute(vendor_stmt).scalar_one_or_none()

    if not vendor or product.vendor_id != vendor.id:
        return jsonify({"error": "Unauthorized: You do not own this product listing"}), 403

    try:
        # Soft-delete by marking inactive
        product.is_active = False
        db.session.commit()
        return (
            jsonify(
                {
                    "message": "Product deactivated successfully",
                    "data": {"id": str(product.id), "is_active": False},
                }
            ),
            200,
        )
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Failed to deactivate product: {str(exc)}"}), 500
