"""FoodX models package.

All models are imported here so Alembic migrations and Flask can discover them.
"""

from app.models.cart import CartItem
from app.models.delivery import Delivery, DeliveryStatus
from app.models.order import (
    Order,
    OrderItem,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
    generate_order_number,
)
from app.models.otp import OTP, GeneratedOTP, OTPPurpose, OTPVerification
from app.models.product import Category, Product
from app.models.user import User, UserRole
from app.models.vendor import Vendor
from app.models.wallet import (
    TransactionSource,
    TransactionType,
    Wallet,
    WalletTransaction,
)

__all__ = [
    # Cart
    "CartItem",
    # Delivery
    "Delivery",
    "DeliveryStatus",
    # Order
    "Order",
    "OrderItem",
    "OrderStatus",
    "PaymentMethod",
    "PaymentStatus",
    "generate_order_number",
    # OTP
    "OTP",
    "OTPVerification",
    "GeneratedOTP",
    "OTPPurpose",

    # Product & Category
    "Category",
    "Product",
    # User
    "User",
    "UserRole",
    # Vendor
    "Vendor",
    # Wallet
    "Wallet",
    "WalletTransaction",
    "TransactionSource",
    "TransactionType",
]
