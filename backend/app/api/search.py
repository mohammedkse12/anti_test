"""Global search routes for FoodX B2B marketplace."""

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

search_bp = Blueprint("search", __name__)


def _parse_uuid(val: Any) -> uuid.UUID | None:
    """Safely parse input string or UUID object to uuid.UUID."""
    if isinstance(val, uuid.UUID):
        return val
    try:
        return uuid.UUID(str(val))
    except (ValueError, TypeError):
        return None


@search_bp.route("", methods=["GET"])
@search_bp.route("/", methods=["GET"])
def search_products() -> Tuple[Any, int]:
    """Search products across bilingual names and descriptions with filtering.

    Query Parameters:
        query / q: str - Search query term.
        category_id: int - Filter by product category.
        vendor_id: uuid - Filter by vendor.
        min_price: float - Minimum price.
        max_price: float - Maximum price.
        lang: str - Language preference ('en' or 'ar').
        page: int - Page number (default: 1).
        per_page: int - Items per page (default: 20, max: 100).
    """
    try:
        query_text = (request.args.get("query") or request.args.get("q") or "").strip()
        category_id = request.args.get("category_id", type=int)
        vendor_id_str = request.args.get("vendor_id")
        lang = request.args.get("lang", "en")
        page = max(1, request.args.get("page", default=1, type=int))
        per_page = min(100, max(1, request.args.get("per_page", default=20, type=int)))

        stmt = db.select(Product).where(Product.is_active == True)  # noqa: E712

        # Bilingual multi-column search
        if query_text:
            search_pattern = f"%{query_text}%"
            stmt = stmt.where(
                or_(
                    Product.name_en.ilike(search_pattern),
                    Product.name_ar.ilike(search_pattern),
                    Product.description_en.ilike(search_pattern),
                    Product.description_ar.ilike(search_pattern),
                )
            )

        if category_id:
            stmt = stmt.where(Product.category_id == category_id)

        if vendor_id_str:
            vid = _parse_uuid(vendor_id_str)
            if vid:
                stmt = stmt.where(Product.vendor_id == vid)

        min_price = request.args.get("min_price", type=float)
        if min_price is not None:
            stmt = stmt.where(Product.price >= Decimal(str(min_price)))

        max_price = request.args.get("max_price", type=float)
        if max_price is not None:
            stmt = stmt.where(Product.price <= Decimal(str(max_price)))

        count_stmt = db.select(db.func.count()).select_from(stmt.subquery())
        total = db.session.execute(count_stmt).scalar() or 0

        paginated_stmt = (
            stmt.order_by(Product.name_en.asc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
        products = db.session.execute(paginated_stmt).scalars().all()
        total_pages = (total + per_page - 1) // per_page if total > 0 else 1

        return (
            jsonify(
                {
                    "message": "Search results retrieved successfully",
                    "data": {
                        "query": query_text,
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
        return jsonify({"error": f"Search failed: {str(exc)}"}), 500
