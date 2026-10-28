"""Shopping Cart routes for FoodX B2B marketplace."""

from __future__ import annotations

import uuid
from typing import Any, Dict, Tuple

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.extensions import db
from app.models.cart import CartItem
from app.models.delivery import Delivery
from app.models.order import Order, OrderItem
from app.models.product import Category, Product
from app.models.user import User
from app.models.vendor import Vendor
from app.models.wallet import Wallet, WalletTransaction
from app.utils.decorators import admin_required, vendor_required

cart_bp = Blueprint("cart", __name__)


def _parse_uuid(val: Any) -> uuid.UUID | None:
    """Safely parse input string or UUID object to uuid.UUID."""
    if isinstance(val, uuid.UUID):
        return val
    try:
        return uuid.UUID(str(val))
    except (ValueError, TypeError):
        return None


@cart_bp.route("", methods=["GET"])
@cart_bp.route("/", methods=["GET"])
@jwt_required()
def get_cart() -> Tuple[Any, int]:
    """Retrieve all shopping cart items for the authenticated user with subtotals."""
    try:
        user_id = get_jwt_identity()
        uid = _parse_uuid(user_id)
        if not uid:
            return jsonify({"error": "Invalid user identity"}), 401

        lang = request.args.get("lang", "en")

        stmt = (
            db.select(CartItem)
            .where(CartItem.user_id == uid)
            .order_by(CartItem.created_at.asc())
        )
        cart_items = db.session.execute(stmt).scalars().all()

        items_data = [item.to_dict(lang=lang) for item in cart_items]
        total_price = round(sum(i["subtotal"] for i in items_data), 2)
        total_quantity = sum(i["quantity"] for i in items_data)

        return (
            jsonify(
                {
                    "message": "Cart retrieved successfully",
                    "data": {
                        "items": items_data,
                        "item_count": len(items_data),
                        "total_quantity": total_quantity,
                        "subtotal": total_price,
                        "currency": "SDG",
                    },
                }
            ),
            200,
        )
    except Exception as exc:
        return jsonify({"error": f"Failed to retrieve cart: {str(exc)}"}), 500


@cart_bp.route("/items", methods=["POST"])
@jwt_required()
def add_to_cart() -> Tuple[Any, int]:
    """Add a product to the user's cart or increment quantity if already present."""
    user_id = get_jwt_identity()
    uid = _parse_uuid(user_id)
    if not uid:
        return jsonify({"error": "Invalid user identity"}), 401

    payload = request.get_json(silent=True) or {}
    product_id_raw = payload.get("product_id")
    quantity_raw = payload.get("quantity", 1)

    p_uuid = _parse_uuid(product_id_raw)
    if not p_uuid:
        return jsonify({"error": "Valid product_id is required"}), 400

    try:
        quantity = int(quantity_raw)
        if quantity <= 0:
            raise ValueError()
    except (ValueError, TypeError):
        return jsonify({"error": "Quantity must be a positive integer"}), 400

    # Validate product exists and is active
    product = db.session.get(Product, p_uuid)
    if not product or not product.is_active:
        return jsonify({"error": "Product is not available for purchase"}), 404

    if quantity < product.min_order_qty:
        return (
            jsonify(
                {
                    "error": f"Minimum order quantity for '{product.name_en}' is {product.min_order_qty}"
                }
            ),
            400,
        )

    # Check stock
    if product.stock_qty < quantity:
        return (
            jsonify(
                {
                    "error": f"Only {product.stock_qty} unit(s) available in stock"
                }
            ),
            400,
        )

    # Check for existing cart row
    stmt = db.select(CartItem).where(
        CartItem.user_id == uid,
        CartItem.product_id == p_uuid,
    )
    existing_item = db.session.execute(stmt).scalar_one_or_none()

    try:
        if existing_item:
            new_qty = existing_item.quantity + quantity
            if product.stock_qty < new_qty:
                return (
                    jsonify(
                        {
                            "error": f"Cannot add {quantity} more. Total requested ({new_qty}) exceeds stock ({product.stock_qty})."
                        }
                    ),
                    400,
                )
            existing_item.quantity = new_qty
            item_to_return = existing_item
        else:
            new_item = CartItem(
                user_id=uid,
                product_id=p_uuid,
                quantity=quantity,
            )
            db.session.add(new_item)
            item_to_return = new_item

        db.session.commit()
        return (
            jsonify(
                {
                    "message": "Item added to cart successfully",
                    "data": item_to_return.to_dict(),
                }
            ),
            201 if not existing_item else 200,
        )
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Failed to add item to cart: {str(exc)}"}), 500


@cart_bp.route("/items/<string:item_id>", methods=["PUT"])
@jwt_required()
def update_cart_item(item_id: str) -> Tuple[Any, int]:
    """Update the quantity of a specific cart item."""
    user_id = get_jwt_identity()
    uid = _parse_uuid(user_id)
    cid = _parse_uuid(item_id)

    if not uid or not cid:
        return jsonify({"error": "Invalid item or user identifier"}), 400

    payload = request.get_json(silent=True) or {}
    quantity_raw = payload.get("quantity")

    try:
        quantity = int(quantity_raw)
        if quantity <= 0:
            raise ValueError()
    except (ValueError, TypeError):
        return jsonify({"error": "Quantity must be a positive integer"}), 400

    stmt = db.select(CartItem).where(CartItem.id == cid, CartItem.user_id == uid)
    cart_item = db.session.execute(stmt).scalar_one_or_none()

    if not cart_item:
        return jsonify({"error": f"Cart item '{item_id}' not found"}), 404

    # Validate stock
    product = cart_item.product
    if not product or not product.is_active:
        return jsonify({"error": "Product is no longer available"}), 400

    if quantity < product.min_order_qty:
        return (
            jsonify(
                {
                    "error": f"Minimum order quantity for '{product.name_en}' is {product.min_order_qty}"
                }
            ),
            400,
        )

    if product.stock_qty < quantity:
        return (
            jsonify(
                {
                    "error": f"Requested quantity ({quantity}) exceeds available stock ({product.stock_qty})"
                }
            ),
            400,
        )

    try:
        cart_item.quantity = quantity
        db.session.commit()
        return (
            jsonify(
                {
                    "message": "Cart item quantity updated successfully",
                    "data": cart_item.to_dict(),
                }
            ),
            200,
        )
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Failed to update cart item: {str(exc)}"}), 500


@cart_bp.route("/items/<string:item_id>", methods=["DELETE"])
@jwt_required()
def remove_cart_item(item_id: str) -> Tuple[Any, int]:
    """Remove a single line item from the user's cart."""
    user_id = get_jwt_identity()
    uid = _parse_uuid(user_id)
    cid = _parse_uuid(item_id)

    if not uid or not cid:
        return jsonify({"error": "Invalid item or user identifier"}), 400

    stmt = db.select(CartItem).where(CartItem.id == cid, CartItem.user_id == uid)
    cart_item = db.session.execute(stmt).scalar_one_or_none()

    if not cart_item:
        return jsonify({"error": f"Cart item '{item_id}' not found"}), 404

    try:
        db.session.delete(cart_item)
        db.session.commit()
        return (
            jsonify(
                {
                    "message": "Item removed from cart successfully",
                    "data": {"id": item_id},
                }
            ),
            200,
        )
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Failed to remove cart item: {str(exc)}"}), 500


@cart_bp.route("", methods=["DELETE"])
@cart_bp.route("/", methods=["DELETE"])
@jwt_required()
def clear_cart() -> Tuple[Any, int]:
    """Clear all items from the authenticated user's shopping cart."""
    user_id = get_jwt_identity()
    uid = _parse_uuid(user_id)
    if not uid:
        return jsonify({"error": "Invalid user identity"}), 401

    try:
        stmt = db.delete(CartItem).where(CartItem.user_id == uid)
        result = db.session.execute(stmt)
        db.session.commit()
        return (
            jsonify(
                {
                    "message": "Cart cleared successfully",
                    "data": {"deleted_count": result.rowcount},
                }
            ),
            200,
        )
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Failed to clear cart: {str(exc)}"}), 500
