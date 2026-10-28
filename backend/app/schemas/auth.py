"""Authentication and User Marshmallow Schemas.

Provides validation and serialization for registration, login, OTP verification,
and user profile data in the FoodX B2B marketplace.
"""

import re
from marshmallow import Schema, fields, validate, validates, ValidationError, pre_load


SUDANESE_PHONE_REGEX = r"^\+249[0-9]{9}$"


def normalize_phone_number(phone_str: str) -> str:
    """Normalize input phone string into standard Sudanese format: +249XXXXXXXXX."""
    if not phone_str:
        return phone_str

    cleaned = re.sub(r"[\s\-\(\)]", "", phone_str.strip())
    # 09XXXXXXXX -> +2499XXXXXXXX or 01XXXXXXXX -> +2491XXXXXXXX
    if cleaned.startswith("0") and len(cleaned) == 10:
        cleaned = "+249" + cleaned[1:]
    # 249XXXXXXXXX -> +249XXXXXXXXX
    elif cleaned.startswith("249") and len(cleaned) == 12:
        cleaned = "+" + cleaned
    # 00249XXXXXXXXX -> +249XXXXXXXXX
    elif cleaned.startswith("00249") and len(cleaned) == 14:
        cleaned = "+" + cleaned[2:]

    return cleaned


class PhoneField(fields.String):
    """Marshmallow field validating Sudanese telephone numbers."""

    default_error_messages = {
        "invalid_phone": "Phone number must be a valid Sudanese number in format +249XXXXXXXXX (9 digits after +249)."
    }

    def _validate(self, value):
        super()._validate(value)
        if not re.match(SUDANESE_PHONE_REGEX, value):
            raise self.make_error("invalid_phone")


class RegisterSchema(Schema):
    """Validation schema for user registration (retailer / vendor)."""

    phone = PhoneField(required=True)
    password = fields.String(
        required=True,
        load_only=True,
        validate=validate.Length(min=6, error="Password must be at least 6 characters long."),
    )
    full_name = fields.String(
        required=True,
        validate=validate.Length(min=2, max=100, error="Full name must be between 2 and 100 characters."),
    )
    role = fields.String(
        required=True,
        validate=validate.OneOf(
            ["retailer", "vendor"],
            error="Role must be either 'retailer' or 'vendor'.",
        ),
    )
    city = fields.String(
        required=True,
        validate=validate.Length(min=1, max=100, error="City is required."),
    )
    address = fields.String(
        required=True,
        validate=validate.Length(min=1, max=255, error="Address is required."),
    )
    email = fields.Email(
        load_default=None,
        allow_none=True,
        error="Invalid email address format.",
    )

    @pre_load
    def sanitize_input(self, data, **kwargs):
        """Pre-process input values, normalizing phone and stripping strings."""
        if not isinstance(data, dict):
            return data
        data_copy = data.copy()
        if "phone" in data_copy and isinstance(data_copy["phone"], str):
            data_copy["phone"] = normalize_phone_number(data_copy["phone"])
        for str_field in ["full_name", "city", "address", "email"]:
            if str_field in data_copy and isinstance(data_copy[str_field], str):
                data_copy[str_field] = data_copy[str_field].strip()
        return data_copy


class VendorRegisterSchema(RegisterSchema):
    """Validation schema extending RegisterSchema for vendor accounts."""

    business_name = fields.String(
        required=True,
        validate=validate.Length(
            min=2, max=150, error="Business name must be between 2 and 150 characters."
        ),
    )
    business_name_ar = fields.String(
        load_default=None,
        allow_none=True,
        validate=validate.Length(max=150, error="Arabic business name cannot exceed 150 characters."),
    )
    role = fields.String(
        load_default="vendor",
        validate=validate.Equal("vendor", error="Role for vendor registration must be 'vendor'."),
    )

    @pre_load
    def sanitize_vendor_input(self, data, **kwargs):
        """Sanitize vendor specific fields."""
        if not isinstance(data, dict):
            return data
        data_copy = data.copy()
        if "business_name" in data_copy and isinstance(data_copy["business_name"], str):
            data_copy["business_name"] = data_copy["business_name"].strip()
        if "business_name_ar" in data_copy and isinstance(data_copy["business_name_ar"], str):
            data_copy["business_name_ar"] = data_copy["business_name_ar"].strip()
        return data_copy


class LoginSchema(Schema):
    """Validation schema for user phone-based login."""

    phone = PhoneField(required=True)

    @pre_load
    def sanitize_phone(self, data, **kwargs):
        """Normalize phone number before validation."""
        if isinstance(data, dict) and "phone" in data and isinstance(data["phone"], str):
            data_copy = data.copy()
            data_copy["phone"] = normalize_phone_number(data_copy["phone"])
            return data_copy
        return data


class OTPSendSchema(Schema):
    """Validation schema for sending or resending an OTP code."""

    phone = PhoneField(required=True)
    purpose = fields.String(
        required=True,
        validate=validate.OneOf(
            ["signup", "login"],
            error="Purpose must be either 'signup' or 'login'.",
        ),
    )

    @pre_load
    def sanitize_data(self, data, **kwargs):
        """Normalize phone number and lowercase purpose."""
        if not isinstance(data, dict):
            return data
        data_copy = data.copy()
        if "phone" in data_copy and isinstance(data_copy["phone"], str):
            data_copy["phone"] = normalize_phone_number(data_copy["phone"])
        if "purpose" in data_copy and isinstance(data_copy["purpose"], str):
            data_copy["purpose"] = data_copy["purpose"].strip().lower()
        return data_copy


class OTPVerifySchema(Schema):
    """Validation schema for verifying a submitted OTP code."""

    phone = PhoneField(required=True)
    otp_code = fields.String(
        required=True,
        validate=validate.Regexp(r"^\d{6}$", error="OTP code must be exactly 6 digits."),
    )
    purpose = fields.String(
        required=True,
        validate=validate.OneOf(
            ["signup", "login"],
            error="Purpose must be either 'signup' or 'login'.",
        ),
    )

    @pre_load
    def sanitize_data(self, data, **kwargs):
        """Normalize phone number and trim OTP code."""
        if not isinstance(data, dict):
            return data
        data_copy = data.copy()
        if "phone" in data_copy and isinstance(data_copy["phone"], str):
            data_copy["phone"] = normalize_phone_number(data_copy["phone"])
        if "otp_code" in data_copy and isinstance(data_copy["otp_code"], str):
            data_copy["otp_code"] = data_copy["otp_code"].strip()
        if "purpose" in data_copy and isinstance(data_copy["purpose"], str):
            data_copy["purpose"] = data_copy["purpose"].strip().lower()
        return data_copy


class UserSchema(Schema):
    """Serialization schema for User model (excludes sensitive password_hash)."""

    id = fields.String(dump_only=True)
    phone = fields.String(dump_only=True)
    full_name = fields.String(dump_only=True)
    role = fields.Function(
        lambda obj: obj.role.value if hasattr(obj.role, "value") else str(obj.role),
        dump_only=True,
    )
    city = fields.String(dump_only=True, allow_none=True)
    address = fields.String(dump_only=True, allow_none=True)
    email = fields.String(dump_only=True, allow_none=True)
    phone_verified = fields.Boolean(dump_only=True)
    is_active = fields.Boolean(dump_only=True)
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)

