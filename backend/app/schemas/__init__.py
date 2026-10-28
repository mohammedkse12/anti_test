"""FoodX Marshmallow Schemas Package.

Exposes all validation and serialization schemas for authentication,
products, categories, orders, and wallets.
"""

from app.schemas.auth import (
    RegisterSchema,
    VendorRegisterSchema,
    LoginSchema,
    OTPSendSchema,
    OTPVerifySchema,
    UserSchema,
    PhoneField,
    normalize_phone_number,
)
from app.schemas.product import (
    CategorySchema,
    ProductSchema,
    ProductCreateSchema,
    ProductUpdateSchema,
    ProductQuerySchema,
)
from app.schemas.order import (
    CartItemSchema,
    OrderItemSchema,
    OrderCreateSchema,
    OrderSchema,
    OrderStatusUpdateSchema,
)
from app.schemas.wallet import (
    WalletSchema,
    TopUpSchema,
    WalletTransactionSchema,
)

__all__ = [
    "RegisterSchema",
    "VendorRegisterSchema",
    "LoginSchema",
    "OTPSendSchema",
    "OTPVerifySchema",
    "UserSchema",
    "PhoneField",
    "normalize_phone_number",
    "CategorySchema",
    "ProductSchema",
    "ProductCreateSchema",
    "ProductUpdateSchema",
    "ProductQuerySchema",
    "CartItemSchema",
    "OrderItemSchema",
    "OrderCreateSchema",
    "OrderSchema",
    "OrderStatusUpdateSchema",
    "WalletSchema",
    "TopUpSchema",
    "WalletTransactionSchema",
]
