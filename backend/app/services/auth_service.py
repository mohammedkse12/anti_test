"""Authentication and OTP Management Service for FoodX.

Encapsulates user registration, OTP generation/verification with rate limiting,
phone-based authentication, and JWT token issuance.
"""

import enum
import os
import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from flask import current_app
from flask_jwt_extended import create_access_token, create_refresh_token

from app.models.user import User, UserRole
from app.models.otp import OTPVerification, OTPPurpose
from app.models.vendor import Vendor
from app.models.product import Product, Category
from app.models.order import Order, OrderItem
from app.models.wallet import Wallet, WalletTransaction
from app.extensions import db


class AuthService:
    """Service providing core authentication, OTP lifecycle, and JWT operations."""

    @classmethod
    def register_user(cls, data: dict) -> User:
        """Register a new user, create digital wallet, and vendor record if applicable.

        Args:
            data: Validated dictionary containing user registration details.

        Returns:
            Newly created User model instance.

        Raises:
            ValueError: If user with phone or email already exists.
        """
        phone = data["phone"]

        # Check phone uniqueness
        existing_phone = db.session.execute(
            db.select(User).filter_by(phone=phone)
        ).scalar_one_or_none()
        if existing_phone:
            raise ValueError(f"An account with phone number '{phone}' already exists.")

        # Check email uniqueness if email is provided
        email = data.get("email")
        if email:
            existing_email = db.session.execute(
                db.select(User).filter_by(email=email)
            ).scalar_one_or_none()
            if existing_email:
                raise ValueError(f"An account with email '{email}' already exists.")

        # Parse role enum
        raw_role = data.get("role", "retailer")
        role_enum = UserRole(raw_role) if isinstance(raw_role, str) else raw_role

        # Instantiate User model
        user = User(
            phone=phone,
            full_name=data["full_name"],
            role=role_enum,
            city=data.get("city"),
            address=data.get("address"),
            email=email,
            phone_verified=False,
            is_active=True,
        )

        # Hash and store password
        password = data["password"]
        if hasattr(user, "set_password") and callable(getattr(user, "set_password")):
            user.set_password(password)
        else:
            from werkzeug.security import generate_password_hash
            user.password_hash = generate_password_hash(password)

        db.session.add(user)
        db.session.flush()  # Obtain user.id for dependent entities

        # Create user digital wallet with 0.00 SDG balance
        wallet = Wallet(user_id=user.id, balance=Decimal("0.00"))
        db.session.add(wallet)

        # If role is vendor, create corresponding Vendor profile
        if role_enum == UserRole.VENDOR or raw_role == "vendor":
            b_name = data.get("business_name") or user.full_name
            b_name_ar = data.get("business_name_ar") or b_name
            vendor = Vendor(
                user_id=user.id,
                business_name=b_name,
                business_name_ar=b_name_ar,
            )
            db.session.add(vendor)

        db.session.commit()
        return user

    @classmethod
    def send_otp(cls, phone: str, purpose: str) -> dict:
        """Generate and store a 6-digit hashed OTP with rate limiting.

        Enforces rate limit: max 1 OTP per phone per minute.
        In development mode, prints the OTP to console.

        Args:
            phone: Destination phone number in Sudanese format (+249...).
            purpose: Purpose of the OTP ('signup' or 'login').

        Returns:
            Dictionary containing operation status and metadata.

        Raises:
            ValueError: If rate limit is exceeded.
        """
        # Rate limit enforcement: 1 OTP per phone per minute
        one_minute_ago = datetime.now(timezone.utc) - timedelta(minutes=1)
        recent_request = db.session.execute(
            db.select(OTPVerification)
            .filter(
                OTPVerification.phone == phone,
                OTPVerification.created_at >= one_minute_ago,
            )
            .order_by(OTPVerification.created_at.desc())
        ).scalars().first()

        if recent_request:
            raise ValueError("Rate limit exceeded: Please wait 1 minute before requesting another OTP.")

        purpose_enum = OTPPurpose(purpose) if isinstance(purpose, str) else purpose

        # Generate OTP using model helper
        generated = OTPVerification.generate(
            phone=phone,
            purpose=purpose_enum,
            expiry_minutes=10,
        )
        otp_code = str(generated)
        db.session.commit()

        # Development notification: output to console
        otp_log_message = f"[DEV OTP] Phone: {phone} | Purpose: {purpose} | OTP: {otp_code}"
        print("\n" + "=" * 60)
        print(f" {otp_log_message}")
        print("=" * 60 + "\n", flush=True)

        if current_app:
            current_app.logger.info(otp_log_message)

        return {
            "message": "OTP sent successfully.",
            "phone": phone,
            "purpose": purpose,
            "expires_in_minutes": 10,
        }

    @classmethod
    def verify_otp(cls, phone: str, otp_code: str, purpose: str) -> User:
        """Verify the submitted OTP against stored hashed record.

        Args:
            phone: Phone number to verify.
            otp_code: 6-digit plain OTP code provided by user.
            purpose: Verification purpose ('signup' or 'login').

        Returns:
            The associated User instance upon successful verification.

        Raises:
            ValueError: If OTP is not found, already used, expired, or invalid.
        """
        purpose_enum = OTPPurpose(purpose) if isinstance(purpose, str) else purpose

        record = db.session.execute(
            db.select(OTPVerification)
            .filter(
                OTPVerification.phone == phone,
                OTPVerification.purpose == purpose_enum,
            )
            .order_by(OTPVerification.created_at.desc())
        ).scalars().first()

        if not record:
            raise ValueError("No OTP request found for this phone number and purpose.")

        if record.is_used:
            raise ValueError("This OTP has already been used. Please request a new code.")

        if record.is_expired():
            raise ValueError("OTP has expired. Please request a new code.")

        if record.is_max_attempts():
            raise ValueError("Maximum verification attempts reached. Please request a new OTP.")

        # Verify plain code against bcrypt hash
        if not record.verify(otp_code):
            db.session.commit()  # Persist attempt increment
            raise ValueError("Invalid OTP code.")

        # Locate associated user
        user = db.session.execute(
            db.select(User).filter_by(phone=phone)
        ).scalar_one_or_none()

        if not user:
            raise ValueError("User account associated with this phone number was not found.")

        # Activate phone_verified on signup verification
        if purpose in ("signup", OTPPurpose.SIGNUP):
            user.phone_verified = True

        db.session.commit()
        return user

    @classmethod
    def login(cls, phone: str) -> dict:
        """Initiate login by checking user status and dispatching an OTP.

        Args:
            phone: User's registered phone number.

        Returns:
            Dictionary with confirmation message.

        Raises:
            ValueError: If user does not exist or account is deactivated.
        """
        user = db.session.execute(
            db.select(User).filter_by(phone=phone)
        ).scalar_one_or_none()

        if not user:
            raise ValueError("User with this phone number does not exist.")

        if not user.is_active:
            raise ValueError("Account is deactivated. Please contact support.")

        cls.send_otp(phone, purpose="login")

        return {
            "message": "OTP sent successfully for login.",
            "phone": phone,
        }

    @classmethod
    def generate_tokens(cls, user: User) -> dict:
        """Create access and refresh JWT tokens containing user claims.

        Args:
            user: Authenticated User model instance.

        Returns:
            Dictionary with access_token, refresh_token, token_type, and user summary.
        """
        role_str = user.role.value if isinstance(user.role, enum.Enum) else str(user.role)

        vendor_id = None
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

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims=claims,
        )
        refresh_token = create_refresh_token(
            identity=str(user.id),
            additional_claims={"role": role_str},
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "Bearer",
            "user": {
                "id": str(user.id),
                "phone": user.phone,
                "full_name": user.full_name,
                "role": role_str,
                "city": user.city,
                "address": user.address,
                "email": user.email,
                "phone_verified": bool(user.phone_verified),
                "vendor_id": vendor_id,
            },
        }


auth_service = AuthService()
