"""API blueprints package for FoodX backend."""

from app.api.admin import admin_bp
from app.api.auth import auth_bp
from app.api.cart import cart_bp
from app.api.categories import categories_bp
from app.api.delivery import delivery_bp
from app.api.orders import orders_bp
from app.api.products import products_bp
from app.api.search import search_bp
from app.api.vendors import vendors_bp
from app.api.wallet import wallet_bp

__all__ = [
    "admin_bp",
    "auth_bp",
    "cart_bp",
    "categories_bp",
    "delivery_bp",
    "orders_bp",
    "products_bp",
    "search_bp",
    "vendors_bp",
    "wallet_bp",
]
