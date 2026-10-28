"""Custom JWT authorization and access-control decorators.

Provides role-based access control (@admin_required, @vendor_required,
@retailer_required) and account status enforcement (@verified_required).
"""

import uuid
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from app.extensions import db
from app.models.user import User



def role_required(role_name: str):
    """Enforce that the authenticated user's JWT claim has the specified role."""
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            current_role = claims.get("role")
            if current_role != role_name:
                return jsonify({
                    "error": f"Access forbidden: {role_name.capitalize()} privilege required.",
                    "code": "FORBIDDEN",
                }), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def admin_required(fn=None):
    """Check JWT claims for role == 'admin'.
    
    Can be used as @admin_required or @admin_required().
    """
    dec = role_required("admin")
    if fn is not None:
        return dec(fn)
    return dec


def vendor_required(fn=None):
    """Check JWT claims for role == 'vendor'.
    
    Can be used as @vendor_required or @vendor_required().
    """
    dec = role_required("vendor")
    if fn is not None:
        return dec(fn)
    return dec


def retailer_required(fn=None):
    """Check JWT claims for role == 'retailer'.
    
    Can be used as @retailer_required or @retailer_required().
    """
    dec = role_required("retailer")
    if fn is not None:
        return dec(fn)
    return dec


def verified_required(fn=None):
    """Check that user's phone is verified.
    
    Inspects JWT claims first, then falls back to current DB record.
    Can be used as @verified_required or @verified_required().
    """
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            # 1. Fast-path: Check token claim
            if claims.get("phone_verified") is True:
                return f(*args, **kwargs)

            # 2. Database verification check
            user_id = get_jwt_identity()
            if user_id:
                try:
                    uid = uuid.UUID(str(user_id))
                except (ValueError, TypeError, AttributeError):
                    uid = user_id
                user = db.session.execute(db.select(User).filter_by(id=uid)).scalar_one_or_none()
                if user and user.phone_verified:
                    return f(*args, **kwargs)


            return jsonify({
                "error": "Phone number is not verified. Please verify your phone to continue.",
                "code": "UNVERIFIED_PHONE",
            }), 403
        return wrapper

    if fn is not None:
        return decorator(fn)
    return decorator
