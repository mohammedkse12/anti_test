"""
FoodX B2B Marketplace - Application Configuration.

This module defines configuration classes for different runtime environments
(Development, Production, Testing) with settings for database, JWT authentication,
OTP verification, file uploads, and external services.
"""

from datetime import timedelta
import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory of the backend application
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file if available
load_dotenv(BASE_DIR / ".env")


class BaseConfig:
    """Base configuration containing settings common to all environments."""

    # Security
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-foodx-marketplace-2026")
    DEBUG = False
    TESTING = False

    # Database (PostgreSQL default)
    _raw_db_url = os.getenv(
        "DATABASE_URL",
        "postgresql://foodx:foodx123@localhost:5432/foodx_db",
    )
    # Normalize postgres:// scheme to postgresql:// for SQLAlchemy compatibility
    if _raw_db_url and _raw_db_url.startswith("postgres://"):
        _raw_db_url = _raw_db_url.replace("postgres://", "postgresql://", 1)

    SQLALCHEMY_DATABASE_URI = _raw_db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }

    # JWT Authentication settings
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"

    # OTP (One-Time Password) settings
    OTP_EXPIRY_MINUTES = int(os.getenv("OTP_EXPIRY_MINUTES", "5"))
    OTP_MAX_ATTEMPTS = int(os.getenv("OTP_MAX_ATTEMPTS", "3"))

    # File Upload settings (product images, documents, etc.)
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", str(BASE_DIR / "uploads" / "products"))
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max file size
    ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}

    # SMS Provider setting ("console" for dev/test, "twilio" for prod)
    SMS_PROVIDER = os.getenv("SMS_PROVIDER", "console")

    # CORS configuration
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")

    # API Documentation (Flask-Smorest / OpenAPI)
    API_TITLE = "FoodX B2B Marketplace API"
    API_VERSION = "v1"
    OPENAPI_VERSION = "3.0.3"
    OPENAPI_URL_PREFIX = "/api/docs"
    OPENAPI_SWAGGER_UI_PATH = "/swagger"
    OPENAPI_SWAGGER_UI_URL = "https://cdn.jsdelivr.net/npm/swagger-ui-dist/"


class DevelopmentConfig(BaseConfig):
    """Development environment configuration."""

    DEBUG = True
    SMS_PROVIDER = os.getenv("SMS_PROVIDER", "console")


class ProductionConfig(BaseConfig):
    """Production environment configuration with hardened settings."""

    DEBUG = False
    SMS_PROVIDER = os.getenv("SMS_PROVIDER", "twilio")


class TestingConfig(BaseConfig):
    """Testing environment configuration using in-memory database."""

    TESTING = True
    DEBUG = True
    # In-memory SQLite for rapid unit testing without external database dependency
    SQLALCHEMY_DATABASE_URI = os.getenv("TEST_DATABASE_URL", "sqlite:///:memory:")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(seconds=10)
    SMS_PROVIDER = "console"


# Environment configuration mapping
config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}
