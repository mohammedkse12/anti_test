"""OTP verification model for FoodX phone-based authentication."""

from __future__ import annotations

import enum
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from sqlalchemy import Boolean, DateTime, Enum as SA_Enum, Integer, String, Uuid, or_
from sqlalchemy.orm import Mapped, mapped_column

from app.extensions import db


class OTPPurpose(str, enum.Enum):
    """OTP purpose enumeration."""

    SIGNUP = "signup"
    LOGIN = "login"


class GeneratedOTP(str):
    """String subclass representing plain OTP code with OTP instance attached.

    Enables both:
        plain_code = OTP.generate(...)
    and:
        otp, plain_code = OTP.generate(...)
    """

    otp: OTP

    def __new__(cls, plain_code: str, otp: OTP):
        obj = super().__new__(cls, plain_code)
        obj.otp = otp
        return obj

    def __iter__(self):
        return iter((self.otp, str(self)))


class OTP(db.Model):
    """One-Time Password (OTP) verification record."""

    __tablename__ = "otps"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    phone: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )
    # Storing 60-character bcrypt hash of the 6-digit plain OTP
    otp_code: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    purpose: Mapped[OTPPurpose] = mapped_column(
        SA_Enum(OTPPurpose, native_enum=False, length=20),
        nullable=False,
    )
    is_used: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    attempts: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def is_expired(self) -> bool:
        """Check if OTP expiration time has passed."""
        return datetime.now(timezone.utc) >= self.expires_at

    def is_max_attempts(self) -> bool:
        """Check if OTP has reached the maximum allowed verification attempts (3)."""
        return self.attempts >= 3

    def verify(self, code: str) -> bool:
        """Verify given plain code against stored bcrypt hash and increment attempts.

        Args:
            code: 6-digit plain text code to verify.

        Returns:
            True if verification succeeds, False otherwise.
        """
        if self.is_used or self.is_expired() or self.is_max_attempts():
            return False

        self.attempts += 1

        if not code or not isinstance(code, str):
            return False

        try:
            matches = bcrypt.checkpw(
                code.strip().encode("utf-8"),
                self.otp_code.encode("utf-8"),
            )
        except (ValueError, TypeError):
            matches = False

        if matches:
            self.is_used = True
            return True

        return False

    @classmethod
    def generate(
        cls,
        phone: str,
        purpose: OTPPurpose | str,
        expiry_minutes: int = 10,
    ) -> GeneratedOTP:
        """Generate a new 6-digit OTP, persist record to db.session, and return plain code.

        Supports both:
            plain_code = OTP.generate(phone, purpose)
        and:
            otp, plain_code = OTP.generate(phone, purpose)

        Args:
            phone: Phone number to issue OTP for.
            purpose: Reason for OTP ('signup' or 'login').
            expiry_minutes: Minutes until expiration (default: 10).

        Returns:
            GeneratedOTP string containing the plain 6-digit code.
        """
        plain_code = f"{secrets.randbelow(900000) + 100000:06d}"
        salt = bcrypt.gensalt()
        hashed_code = bcrypt.hashpw(plain_code.encode("utf-8"), salt).decode("utf-8")

        purpose_enum = OTPPurpose(purpose) if isinstance(purpose, str) else purpose
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=expiry_minutes)

        otp = cls(
            phone=phone,
            otp_code=hashed_code,
            purpose=purpose_enum,
            expires_at=expires_at,
            is_used=False,
            attempts=0,
            created_at=now,
        )
        db.session.add(otp)
        return GeneratedOTP(plain_code, otp)

    @classmethod
    def cleanup_expired(cls) -> int:
        """Delete expired or already used OTP records from database.

        Returns:
            Number of deleted records.
        """
        now = datetime.now(timezone.utc)
        stmt = db.delete(cls).where(
            or_(
                cls.expires_at < now,
                cls.is_used.is_(True),
            )
        )
        result = db.session.execute(stmt)
        return result.rowcount

    def to_dict(self) -> dict:
        """Serialize OTP metadata to dictionary (excluding hashed code).

        Returns:
            Dictionary containing OTP info.
        """
        return {
            "id": str(self.id),
            "phone": self.phone,
            "purpose": self.purpose.value if isinstance(self.purpose, enum.Enum) else str(self.purpose),
            "is_used": self.is_used,
            "attempts": self.attempts,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return f"<OTP id={self.id} phone={self.phone} purpose={self.purpose} used={self.is_used}>"


# Alias for compatibility with import patterns
OTPVerification = OTP

