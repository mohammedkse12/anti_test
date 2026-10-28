"""Product and Category Marshmallow Schemas.

Provides validation and serialization for categories, products,
product creation, updates, and filtering query parameters in FoodX.
"""

from marshmallow import Schema, fields, validate, pre_load


class CategorySchema(Schema):
    """Schema for Category serialization and representation."""

    id = fields.Raw(dump_only=True)
    name_en = fields.String(
        required=True,
        validate=validate.Length(min=1, max=100, error="English category name must be between 1 and 100 characters."),
    )
    name_ar = fields.String(
        required=True,
        validate=validate.Length(min=1, max=100, error="Arabic category name must be between 1 and 100 characters."),
    )
    icon = fields.String(allow_none=True, load_default=None)
    slug = fields.String(allow_none=True, load_default=None)
    parent_id = fields.Raw(allow_none=True, load_default=None)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)


class ProductSchema(Schema):
    """Full product serialization schema."""

    id = fields.String(dump_only=True)
    vendor_id = fields.String(dump_only=True)
    category_id = fields.Integer(dump_only=True)
    name_en = fields.String(dump_only=True)
    name_ar = fields.String(dump_only=True)
    description_en = fields.String(dump_only=True, allow_none=True)
    description_ar = fields.String(dump_only=True, allow_none=True)
    price = fields.Decimal(as_string=True, dump_only=True)
    unit = fields.String(dump_only=True)
    stock_qty = fields.Integer(dump_only=True)
    stock_quantity = fields.Integer(attribute="stock_qty", dump_only=True)
    min_order_qty = fields.Integer(dump_only=True)
    min_order_quantity = fields.Integer(attribute="min_order_qty", dump_only=True)
    image_url = fields.String(dump_only=True, allow_none=True)
    is_active = fields.Boolean(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
    category = fields.Nested(CategorySchema, dump_only=True, allow_none=True)


class ProductCreateSchema(Schema):
    """Validation schema for creating a new product (vendor_id is auto-filled from session)."""

    category_id = fields.Integer(required=True, error_messages={"required": "Category ID is required."})
    name_en = fields.String(
        required=True,
        validate=validate.Length(min=1, max=150, error="English name must be between 1 and 150 characters."),
    )
    name_ar = fields.String(
        required=True,
        validate=validate.Length(min=1, max=150, error="Arabic name must be between 1 and 150 characters."),
    )
    description_en = fields.String(allow_none=True, load_default=None)
    description_ar = fields.String(allow_none=True, load_default=None)
    price = fields.Decimal(
        required=True,
        as_string=True,
        validate=validate.Range(min=0.01, error="Price must be greater than zero."),
    )
    unit = fields.String(
        required=True,
        validate=validate.Length(min=1, max=50, error="Unit must be specified (e.g., kg, bag, carton)."),
    )
    stock_quantity = fields.Integer(
        load_default=0,
        validate=validate.Range(min=0, error="Stock quantity cannot be negative."),
    )
    stock_qty = fields.Integer(
        load_default=None,
        validate=validate.Range(min=0, error="Stock quantity cannot be negative."),
    )
    min_order_quantity = fields.Integer(
        load_default=1,
        validate=validate.Range(min=1, error="Minimum order quantity must be at least 1."),
    )
    min_order_qty = fields.Integer(
        load_default=None,
        validate=validate.Range(min=1, error="Minimum order quantity must be at least 1."),
    )
    image_url = fields.String(allow_none=True, load_default=None)
    is_active = fields.Boolean(load_default=True)

    @pre_load
    def sanitize_strings(self, data, **kwargs):
        """Strip whitespace from text fields and normalize quantity keys."""
        if not isinstance(data, dict):
            return data
        data_copy = data.copy()
        for field in ["name_en", "name_ar", "unit"]:
            if field in data_copy and isinstance(data_copy[field], str):
                data_copy[field] = data_copy[field].strip()
        if "stock_qty" in data_copy and "stock_quantity" not in data_copy:
            data_copy["stock_quantity"] = data_copy["stock_qty"]
        if "min_order_qty" in data_copy and "min_order_quantity" not in data_copy:
            data_copy["min_order_quantity"] = data_copy["min_order_qty"]
        return data_copy



class ProductUpdateSchema(Schema):
    """Validation schema for partial product updates."""

    category_id = fields.Raw(allow_none=True)
    name_en = fields.String(validate=validate.Length(min=1, max=150))
    name_ar = fields.String(validate=validate.Length(min=1, max=150))
    description_en = fields.String(allow_none=True)
    description_ar = fields.String(allow_none=True)
    price = fields.Decimal(as_string=True, validate=validate.Range(min=0.01))
    unit = fields.String(validate=validate.Length(min=1, max=50))
    stock_quantity = fields.Integer(validate=validate.Range(min=0))
    min_order_quantity = fields.Integer(validate=validate.Range(min=1))
    image_url = fields.String(allow_none=True)
    is_active = fields.Boolean()


class ProductQuerySchema(Schema):
    """Validation schema for query parameters when searching/filtering products."""

    category_id = fields.Raw(load_default=None)
    min_price = fields.Decimal(load_default=None, as_string=True, validate=validate.Range(min=0))
    max_price = fields.Decimal(load_default=None, as_string=True, validate=validate.Range(min=0))
    search = fields.String(load_default=None)
    vendor_id = fields.Raw(load_default=None)
    page = fields.Integer(load_default=1, validate=validate.Range(min=1, error="Page must be at least 1."))
    per_page = fields.Integer(
        load_default=20,
        validate=validate.Range(min=1, max=100, error="Per page must be between 1 and 100."),
    )
