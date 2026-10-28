"""Category management routes for FoodX B2B marketplace."""

from __future__ import annotations

import re
import uuid
from typing import Any, Dict, Tuple

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.extensions import db
from app.models.delivery import Delivery
from app.models.order import Order, OrderItem
from app.models.product import Category, Product
from app.models.user import User
from app.models.vendor import Vendor
from app.models.wallet import Wallet, WalletTransaction
from app.utils.decorators import admin_required, vendor_required

categories_bp = Blueprint("categories", __name__)


def _slugify(text: str) -> str:
    """Generate a URL-safe slug from a text string."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-")


@categories_bp.route("", methods=["GET"])
@categories_bp.route("/", methods=["GET"])
def list_categories() -> Tuple[Any, int]:
    """List all categories.

    If parent_id query param is not supplied or is 'null', returns top-level
    categories with their direct children nested.
    """
    try:
        lang = request.args.get("lang", "en")
        parent_id_arg = request.args.get("parent_id")

        if parent_id_arg is not None and parent_id_arg.lower() not in ("null", "none"):
            try:
                parent_id = int(parent_id_arg)
                stmt = db.select(Category).where(Category.parent_id == parent_id)
            except ValueError:
                return jsonify({"error": "Invalid parent_id parameter"}), 400
        else:
            # By default list root categories with children nested
            stmt = db.select(Category).where(Category.parent_id.is_(None))

        categories = db.session.execute(stmt.order_by(Category.name_en.asc())).scalars().all()

        return (
            jsonify(
                {
                    "message": "Categories retrieved successfully",
                    "data": [c.to_dict(lang=lang, include_children=True) for c in categories],
                }
            ),
            200,
        )
    except Exception as exc:
        return jsonify({"error": f"Failed to list categories: {str(exc)}"}), 500


@categories_bp.route("/<int:category_id>", methods=["GET"])
def get_category(category_id: int) -> Tuple[Any, int]:
    """Retrieve category details along with associated active products."""
    try:
        lang = request.args.get("lang", "en")
        category = db.session.get(Category, category_id)

        if not category:
            return jsonify({"error": f"Category with ID {category_id} not found"}), 404

        # Fetch active products in this category
        products_stmt = (
            db.select(Product)
            .where(Product.category_id == category.id, Product.is_active == True)  # noqa: E712
            .order_by(Product.name_en.asc())
        )
        products = db.session.execute(products_stmt).scalars().all()

        data = category.to_dict(lang=lang, include_children=True)
        data["products"] = [p.to_dict(lang=lang) for p in products]

        return (
            jsonify(
                {
                    "message": "Category retrieved successfully",
                    "data": data,
                }
            ),
            200,
        )
    except Exception as exc:
        return jsonify({"error": f"Failed to retrieve category: {str(exc)}"}), 500


@categories_bp.route("", methods=["POST"])
@categories_bp.route("/", methods=["POST"])
@jwt_required()
@admin_required
def create_category() -> Tuple[Any, int]:
    """Create a new product category (admin only)."""
    payload = request.get_json(silent=True) or {}

    name_en = payload.get("name_en", "").strip()
    name_ar = payload.get("name_ar", "").strip()

    if not name_en or not name_ar:
        return jsonify({"error": "Fields 'name_en' and 'name_ar' are required"}), 400

    icon = payload.get("icon")
    parent_id = payload.get("parent_id")

    # Validate parent category if specified
    if parent_id is not None:
        parent_cat = db.session.get(Category, parent_id)
        if not parent_cat:
            return jsonify({"error": f"Parent category with ID {parent_id} does not exist"}), 400

    # Auto-generate or sanitize slug
    slug = payload.get("slug", "").strip()
    if not slug:
        slug = _slugify(name_en)

    # Ensure slug uniqueness
    existing_slug = db.session.execute(
        db.select(Category).where(Category.slug == slug)
    ).scalar_one_or_none()
    if existing_slug:
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"

    category = Category(
        name_en=name_en,
        name_ar=name_ar,
        icon=icon,
        slug=slug,
        parent_id=parent_id,
    )

    try:
        db.session.add(category)
        db.session.commit()
        return (
            jsonify(
                {
                    "message": "Category created successfully",
                    "data": category.to_dict(),
                }
            ),
            201,
        )
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Failed to create category: {str(exc)}"}), 500


@categories_bp.route("/<int:category_id>", methods=["PUT"])
@jwt_required()
@admin_required
def update_category(category_id: int) -> Tuple[Any, int]:
    """Update category details (admin only)."""
    category = db.session.get(Category, category_id)
    if not category:
        return jsonify({"error": f"Category with ID {category_id} not found"}), 404

    payload = request.get_json(silent=True) or {}

    if "name_en" in payload:
        name_en = payload["name_en"].strip()
        if not name_en:
            return jsonify({"error": "name_en cannot be empty"}), 400
        category.name_en = name_en

    if "name_ar" in payload:
        name_ar = payload["name_ar"].strip()
        if not name_ar:
            return jsonify({"error": "name_ar cannot be empty"}), 400
        category.name_ar = name_ar

    if "icon" in payload:
        category.icon = payload["icon"]

    if "slug" in payload:
        new_slug = _slugify(payload["slug"])
        if new_slug:
            existing = db.session.execute(
                db.select(Category).where(Category.slug == new_slug, Category.id != category_id)
            ).scalar_one_or_none()
            if existing:
                return jsonify({"error": f"Slug '{new_slug}' is already in use"}), 400
            category.slug = new_slug

    if "parent_id" in payload:
        pid = payload["parent_id"]
        if pid is not None:
            if pid == category.id:
                return jsonify({"error": "A category cannot be its own parent"}), 400
            parent_cat = db.session.get(Category, pid)
            if not parent_cat:
                return jsonify({"error": f"Parent category with ID {pid} does not exist"}), 400
        category.parent_id = pid

    try:
        db.session.commit()
        return (
            jsonify(
                {
                    "message": "Category updated successfully",
                    "data": category.to_dict(),
                }
            ),
            200,
        )
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Failed to update category: {str(exc)}"}), 500


@categories_bp.route("/<int:category_id>", methods=["DELETE"])
@jwt_required()
@admin_required
def delete_category(category_id: int) -> Tuple[Any, int]:
    """Delete category if it has no associated products (admin only)."""
    category = db.session.get(Category, category_id)
    if not category:
        return jsonify({"error": f"Category with ID {category_id} not found"}), 404

    # Check for direct products
    product_count = db.session.execute(
        db.select(db.func.count(Product.id)).where(Product.category_id == category_id)
    ).scalar() or 0

    if product_count > 0:
        return (
            jsonify(
                {
                    "error": f"Cannot delete category: it contains {product_count} product(s). Reassign or delete products first."
                }
            ),
            400,
        )

    # Check for child categories that have products
    child_ids = [c.id for c in category.children]
    if child_ids:
        child_prod_count = db.session.execute(
            db.select(db.func.count(Product.id)).where(Product.category_id.in_(child_ids))
        ).scalar() or 0
        if child_prod_count > 0:
            return (
                jsonify(
                    {
                        "error": f"Cannot delete category: child subcategories contain {child_prod_count} product(s)."
                    }
                ),
                400,
            )

    try:
        db.session.delete(category)
        db.session.commit()
        return (
            jsonify(
                {
                    "message": "Category deleted successfully",
                    "data": {"id": category_id},
                }
            ),
            200,
        )
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Failed to delete category: {str(exc)}"}), 500
