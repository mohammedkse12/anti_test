"""Order and Cart Marshmallow Schemas.

Provides validation and serialization for shopping cart items,
order placement, order status updates, and full order representations in FoodX.
"""

from marshmallow import Schema, fields, validate, pre_load


class CartItemSchema(Schema):
    """Schema representing an item inside a cart or order placement."""

    product_id = fields.Raw(required=True, error_messages={"required": "Product ID is required."})
    quantity = fields.Integer(
        required=True,
        validate=validate.Range(min=1, error="Quantity must be at least 1."),
    )


class OrderItemSchema(Schema):
    """Serialization schema for persisted order line items."""

    id = fields.Raw(dump_only=True)
    order_id = fields.Raw(dump_only=True)
    product_id = fields.Raw(dump_only=True)
    quantity = fields.Integer(dump_only=True)
    unit_price = fields.Decimal(as_string=True, dump_only=True)
    total_price = fields.Decimal(as_string=True, dump_only=True)
    product = fields.Nested("ProductSchema", dump_only=True, allow_none=True)


class OrderCreateSchema(Schema):
    """Validation schema for customer checkout / order creation."""

    vendor_id = fields.Raw(required=True, error_messages={"required": "Vendor ID is required."})
    items = fields.List(
        fields.Nested(CartItemSchema),
        required=True,
        validate=validate.Length(min=1, error="Order must contain at least one item."),
    )
    payment_method = fields.String(
        required=True,
        validate=validate.OneOf(
            ["wallet", "cash_on_delivery", "bank_transfer"],
            error="Payment method must be one of: wallet, cash_on_delivery, bank_transfer.",
        ),
    )
    notes = fields.String(allow_none=True, load_default=None)

    @pre_load
    def sanitize_input(self, data, **kwargs):
        """Sanitize notes and payment method."""
        if not isinstance(data, dict):
            return data
        data_copy = data.copy()
        if "payment_method" in data_copy and isinstance(data_copy["payment_method"], str):
            data_copy["payment_method"] = data_copy["payment_method"].strip().lower()
        if "notes" in data_copy and isinstance(data_copy["notes"], str):
            data_copy["notes"] = data_copy["notes"].strip()
        return data_copy


class OrderSchema(Schema):
    """Full serialization schema for orders."""

    id = fields.String(dump_only=True)
    order_number = fields.String(dump_only=True)
    retailer_id = fields.String(dump_only=True)
    vendor_id = fields.String(dump_only=True)
    total = fields.Decimal(as_string=True, dump_only=True)
    total_amount = fields.Decimal(attribute="total", as_string=True, dump_only=True)
    subtotal = fields.Decimal(as_string=True, dump_only=True)
    delivery_fee = fields.Decimal(as_string=True, dump_only=True)
    order_status = fields.Function(
        lambda obj: obj.order_status.value if hasattr(obj.order_status, "value") else str(obj.order_status),
        dump_only=True,
    )
    status = fields.Function(
        lambda obj: obj.order_status.value if hasattr(obj.order_status, "value") else str(obj.order_status),
        dump_only=True,
    )
    payment_method = fields.Function(
        lambda obj: obj.payment_method.value if hasattr(obj.payment_method, "value") else str(obj.payment_method),
        dump_only=True,
    )
    payment_status = fields.Function(
        lambda obj: obj.payment_status.value if hasattr(obj.payment_status, "value") else str(obj.payment_status),
        dump_only=True,
    )
    notes = fields.String(dump_only=True, allow_none=True)
    items = fields.List(fields.Nested(OrderItemSchema), dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)



class OrderStatusUpdateSchema(Schema):
    """Validation schema for vendor/admin updating order status."""

    order_status = fields.String(
        required=True,
        validate=validate.OneOf(
            ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
            error="Status must be one of: pending, confirmed, processing, shipped, delivered, cancelled.",
        ),
    )

    @pre_load
    def sanitize_status(self, data, **kwargs):
        """Normalize status casing."""
        if isinstance(data, dict) and "order_status" in data and isinstance(data["order_status"], str):
            data_copy = data.copy()
            data_copy["order_status"] = data_copy["order_status"].strip().lower()
            return data_copy
        return data
