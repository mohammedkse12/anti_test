"""Authentication REST API Endpoints.

Provides HTTP routes for user registration, OTP dispatch and verification,
login, JWT token refresh, and user profile retrieval.
"""

import uuid
from flask import Blueprint, request, jsonify
from marshmallow import ValidationError
from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity,
    get_jwt,
    create_access_token,
)


from app.models.user import User
from app.models.vendor import Vendor
from app.extensions import db
from app.schemas.auth import (
    RegisterSchema,
    VendorRegisterSchema,
    LoginSchema,
    OTPSendSchema,
    OTPVerifySchema,
    UserSchema,
)
from app.services.auth_service import AuthService

auth_bp = Blueprint("auth", __name__)
bp = auth_bp  # Alias for flexible factory registration

user_schema = UserSchema()
register_schema = RegisterSchema()
vendor_register_schema = VendorRegisterSchema()
login_schema = LoginSchema()
otp_send_schema = OTPSendSchema()
otp_verify_schema = OTPVerifySchema()


@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new retailer or vendor user and automatically dispatch an OTP.
    
    Expected JSON Payload:
        Retailer: { phone, password, full_name, role='retailer', city, address, email? }
        Vendor:   { phone, password, full_name, role='vendor', city, address, business_name, business_name_ar?, email? }
    """
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Request body must be valid JSON."}), 400

    # Select appropriate schema based on role or vendor fields
    role = payload.get("role")
    if role == "vendor" or "business_name" in payload:
        schema = vendor_register_schema
    else:
        schema = register_schema

    try:
        validated_data = schema.load(payload)
    except ValidationError as err:
        return jsonify({
            "error": "Validation failed",
            "details": err.messages,
        }), 400

    try:
        user = AuthService.register_user(validated_data)
    except ValueError as err:
        return jsonify({"error": str(err)}), 409

    # Automatically dispatch OTP for phone verification
    otp_sent = True
    otp_warning = None
    try:
        AuthService.send_otp(user.phone, purpose="signup")
    except ValueError as err:
        otp_sent = False
        otp_warning = str(err)

    response_data = {
        "message": "User registered successfully. An OTP has been sent to verify your phone number.",
        "user": user_schema.dump(user),
    }
    if not otp_sent and otp_warning:
        response_data["otp_status"] = "failed"
        response_data["otp_warning"] = otp_warning
    else:
        response_data["otp_status"] = "sent"

    return jsonify(response_data), 201


@auth_bp.route("/send-otp", methods=["POST"])
def send_otp():
    """Send or resend a 6-digit OTP code to a phone number.
    
    Expected JSON Payload:
        { phone: "+249XXXXXXXXX", purpose: "signup" | "login" }
    """
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Request body must be valid JSON."}), 400

    try:
        validated_data = otp_send_schema.load(payload)
    except ValidationError as err:
        return jsonify({
            "error": "Validation failed",
            "details": err.messages,
        }), 400

    phone = validated_data["phone"]
    purpose = validated_data["purpose"]

    # For login purpose, ensure the user exists before sending OTP
    if purpose == "login":
        user = db.session.execute(
            db.select(User).filter_by(phone=phone)
        ).scalar_one_or_none()
        if not user:
            return jsonify({"error": "No account found with this phone number."}), 404
        if not user.is_active:
            return jsonify({"error": "Account is deactivated. Please contact support."}), 403

    try:
        result = AuthService.send_otp(phone=phone, purpose=purpose)
        return jsonify(result), 200
    except ValueError as err:
        error_msg = str(err)
        if "rate limit" in error_msg.lower():
            return jsonify({"error": error_msg, "code": "RATE_LIMITED"}), 429
        return jsonify({"error": error_msg}), 400


@auth_bp.route("/verify-otp", methods=["POST"])
def verify_otp():
    """Verify an OTP code.
    
    If purpose is 'signup': Marks user phone as verified and returns JWT tokens.
    If purpose is 'login': Authenticates the user and returns JWT tokens.
    
    Expected JSON Payload:
        { phone: "+249XXXXXXXXX", otp_code: "123456", purpose: "signup" | "login" }
    """
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Request body must be valid JSON."}), 400

    try:
        validated_data = otp_verify_schema.load(payload)
    except ValidationError as err:
        return jsonify({
            "error": "Validation failed",
            "details": err.messages,
        }), 400

    phone = validated_data["phone"]
    otp_code = validated_data["otp_code"]
    purpose = validated_data["purpose"]

    try:
        user = AuthService.verify_otp(phone=phone, otp_code=otp_code, purpose=purpose)
    except ValueError as err:
        return jsonify({"error": str(err), "code": "OTP_VERIFICATION_FAILED"}), 400

    tokens = AuthService.generate_tokens(user)

    if purpose == "signup":
        message = "Phone number verified and account activated successfully."
    else:
        message = "Login successful."

    return jsonify({
        "message": message,
        "tokens": tokens,
        "user": user_schema.dump(user),
    }), 200


@auth_bp.route("/login", methods=["POST"])
def login():
    """Initiate phone-based login by verifying user existence and sending an OTP.
    
    Expected JSON Payload:
        { phone: "+249XXXXXXXXX" }
    """
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "Request body must be valid JSON."}), 400

    try:
        validated_data = login_schema.load(payload)
    except ValidationError as err:
        return jsonify({
            "error": "Validation failed",
            "details": err.messages,
        }), 400

    phone = validated_data["phone"]

    try:
        result = AuthService.login(phone=phone)
        return jsonify(result), 200
    except ValueError as err:
        err_str = str(err)
        if "not exist" in err_str.lower():
            return jsonify({"error": err_str, "code": "USER_NOT_FOUND"}), 404
        if "deactivated" in err_str.lower():
            return jsonify({"error": err_str, "code": "ACCOUNT_DEACTIVATED"}), 403
        if "rate limit" in err_str.lower():
            return jsonify({"error": err_str, "code": "RATE_LIMITED"}), 429
        return jsonify({"error": err_str}), 400


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """Generate a new access token using a valid refresh token."""
    current_user_id = get_jwt_identity()
    try:
        uid = uuid.UUID(str(current_user_id))
    except (ValueError, TypeError, AttributeError):
        uid = current_user_id

    user = db.session.execute(
        db.select(User).filter_by(id=uid)
    ).scalar_one_or_none()

    if not user:
        return jsonify({"error": "User account no longer exists."}), 404
    if not user.is_active:
        return jsonify({"error": "Account is deactivated."}), 403

    vendor_id = None
    role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
    if role_str == "vendor":
        if hasattr(user, "vendor") and user.vendor:
            vendor_id = str(user.vendor.id)
        else:
            vendor = db.session.execute(
                db.select(Vendor).filter_by(user_id=user.id)
            ).scalar_one_or_none()
            if vendor:
                vendor_id = str(vendor.id)

    claims = {
        "role": role_str,
        "phone": user.phone,
        "phone_verified": bool(user.phone_verified),
    }
    if vendor_id is not None:
        claims["vendor_id"] = vendor_id

    new_access_token = create_access_token(
        identity=str(user.id),
        additional_claims=claims,
    )

    return jsonify({
        "access_token": new_access_token,
        "token_type": "Bearer",
    }), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    """Retrieve the profile data of the currently authenticated user."""
    current_user_id = get_jwt_identity()
    try:
        uid = uuid.UUID(str(current_user_id))
    except (ValueError, TypeError, AttributeError):
        uid = current_user_id

    user = db.session.execute(
        db.select(User).filter_by(id=uid)
    ).scalar_one_or_none()


    if not user:
        return jsonify({"error": "User profile not found."}), 404

    user_data = user_schema.dump(user)

    # Attach vendor details if user is a vendor
    role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
    if role_str == "vendor":
        vendor_data = None
        if hasattr(user, "vendor") and user.vendor:
            v = user.vendor
            vendor_data = {
                "id": str(v.id),
                "business_name": getattr(v, "business_name", None),
                "business_name_ar": getattr(v, "business_name_ar", None),
            }
        else:
            v = db.session.execute(
                db.select(Vendor).filter_by(user_id=user.id)
            ).scalar_one_or_none()
            if v:
                vendor_data = {
                    "id": str(v.id),
                    "business_name": getattr(v, "business_name", None),
                    "business_name_ar": getattr(v, "business_name_ar", None),
                }
        user_data["vendor"] = vendor_data

    return jsonify({"user": user_data}), 200


@auth_bp.route("/me", methods=["PUT"])
@jwt_required()
def update_current_user():
    """Update profile data of currently authenticated user."""
    current_user_id = get_jwt_identity()
    try:
        uid = uuid.UUID(str(current_user_id))
    except (ValueError, TypeError, AttributeError):
        uid = current_user_id

    user = db.session.execute(
        db.select(User).filter_by(id=uid)
    ).scalar_one_or_none()

    if not user:
        return jsonify({"error": "User profile not found."}), 404

    payload = request.get_json(silent=True) or {}
    if "full_name" in payload:
        user.full_name = payload["full_name"].strip()
    if "email" in payload:
        user.email = payload["email"].strip() if payload["email"] else None
    if "city" in payload:
        user.city = payload["city"].strip() if payload["city"] else None
    if "address" in payload:
        user.address = payload["address"].strip() if payload["address"] else None
    if "lang_pref" in payload:
        user.lang_pref = payload["lang_pref"].strip()

    # If vendor info is provided and user is vendor, update vendor
    role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
    if role_str == "vendor":
        vendor = db.session.execute(
            db.select(Vendor).filter_by(user_id=user.id)
        ).scalar_one_or_none()
        if vendor:
            if "business_name" in payload:
                vendor.business_name = payload["business_name"].strip()
            if "business_name_ar" in payload:
                vendor.business_name_ar = payload["business_name_ar"].strip()
            if "description" in payload:
                vendor.description = payload["description"]
            if "description_ar" in payload:
                vendor.description_ar = payload["description_ar"]
            if "logo_url" in payload:
                vendor.logo_url = payload["logo_url"]

    try:
        db.session.commit()
        user_data = user_schema.dump(user)
        if role_str == "vendor":
            v = db.session.execute(
                db.select(Vendor).filter_by(user_id=user.id)
            ).scalar_one_or_none()
            if v:
                user_data["vendor"] = {
                    "id": str(v.id),
                    "business_name": getattr(v, "business_name", None),
                    "business_name_ar": getattr(v, "business_name_ar", None),
                    "description": getattr(v, "description", None),
                    "description_ar": getattr(v, "description_ar", None),
                    "logo_url": getattr(v, "logo_url", None),
                }
        return jsonify({
            "message": "Profile updated successfully",
            "user": user_data,
            "data": user_data
        }), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Failed to update profile: {str(exc)}"}), 500


