"""
FoodX B2B Marketplace - Application Factory.

This module initializes and configures the Flask application using the
Application Factory pattern, sets up extensions, registers blueprints with
the /api prefix, and configures centralized JSON error handlers and JWT callbacks.
"""

from datetime import datetime, timezone
import importlib
import logging
import os
from typing import Any, Dict, Optional, Tuple

from flask import Blueprint, Flask, jsonify, request
from marshmallow.exceptions import ValidationError
from werkzeug.exceptions import HTTPException

from app.config import config_by_name, DevelopmentConfig
from app.extensions import cors, db, jwt, migrate

logger = logging.getLogger(__name__)

# Core API blueprint for system endpoints
api_bp = Blueprint("api_core", __name__, url_prefix="/api")


@api_bp.route("/health", methods=["GET"])
def health_check() -> Tuple[Dict[str, Any], int]:
    """Health check endpoint to verify backend service readiness."""
    return (
        jsonify(
            {
                "status": "healthy",
                "service": "FoodX B2B Marketplace API",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "environment": os.getenv("FLASK_ENV", "development"),
                "version": "1.0.0",
            }
        ),
        200,
    )


@api_bp.route("/", methods=["GET"])
def api_root() -> Tuple[Dict[str, Any], int]:
    """Root API endpoint providing platform information."""
    return (
        jsonify(
            {
                "name": "FoodX B2B Marketplace API",
                "version": "v1",
                "documentation": "/api/docs",
                "endpoints": {
                    "health": "/api/health",
                    "auth": "/api/auth",
                    "products": "/api/products",
                    "categories": "/api/categories",
                    "orders": "/api/orders",
                    "cart": "/api/cart",
                },
            }
        ),
        200,
    )


def register_jwt_handlers(jwt_manager: Any) -> None:
    """Configure JWT error handling callbacks returning standardized JSON."""

    @jwt_manager.unauthorized_loader
    def unauthorized_callback(reason: str) -> Tuple[Dict[str, Any], int]:
        return (
            jsonify(
                {
                    "success": False,
                    "error": {
                        "code": "MISSING_AUTHORIZATION_HEADER",
                        "message": reason or "Authorization header is missing or malformed.",
                    },
                }
            ),
            401,
        )

    @jwt_manager.invalid_token_loader
    def invalid_token_callback(reason: str) -> Tuple[Dict[str, Any], int]:
        return (
            jsonify(
                {
                    "success": False,
                    "error": {
                        "code": "INVALID_TOKEN",
                        "message": reason or "The authentication token is invalid.",
                    },
                }
            ),
            401,
        )

    @jwt_manager.expired_token_loader
    def expired_token_callback(jwt_header: dict, jwt_payload: dict) -> Tuple[Dict[str, Any], int]:
        return (
            jsonify(
                {
                    "success": False,
                    "error": {
                        "code": "TOKEN_EXPIRED",
                        "message": "The authentication token has expired. Please refresh your session.",
                    },
                }
            ),
            401,
        )

    @jwt_manager.revoked_token_loader
    def revoked_token_callback(jwt_header: dict, jwt_payload: dict) -> Tuple[Dict[str, Any], int]:
        return (
            jsonify(
                {
                    "success": False,
                    "error": {
                        "code": "TOKEN_REVOKED",
                        "message": "The authentication token has been revoked.",
                    },
                }
            ),
            401,
        )

    @jwt_manager.needs_fresh_token_loader
    def fresh_token_required_callback(jwt_header: dict, jwt_payload: dict) -> Tuple[Dict[str, Any], int]:
        return (
            jsonify(
                {
                    "success": False,
                    "error": {
                        "code": "FRESH_TOKEN_REQUIRED",
                        "message": "A fresh authentication token is required for this sensitive action.",
                    },
                }
            ),
            401,
        )


def register_error_handlers(app: Flask) -> None:
    """Register application-wide error handlers returning consistent JSON responses."""

    @app.errorhandler(400)
    def handle_bad_request(error: Any) -> Tuple[Dict[str, Any], int]:
        message = getattr(error, "description", "Bad Request")
        return (
            jsonify(
                {
                    "success": False,
                    "error": {
                        "code": "BAD_REQUEST",
                        "message": message,
                    },
                }
            ),
            400,
        )

    @app.errorhandler(401)
    def handle_unauthorized(error: Any) -> Tuple[Dict[str, Any], int]:
        message = getattr(error, "description", "Unauthorized access")
        return (
            jsonify(
                {
                    "success": False,
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": message,
                    },
                }
            ),
            401,
        )

    @app.errorhandler(403)
    def handle_forbidden(error: Any) -> Tuple[Dict[str, Any], int]:
        message = getattr(error, "description", "Access forbidden")
        return (
            jsonify(
                {
                    "success": False,
                    "error": {
                        "code": "FORBIDDEN",
                        "message": message,
                    },
                }
            ),
            403,
        )

    @app.errorhandler(404)
    def handle_not_found(error: Any) -> Tuple[Dict[str, Any], int]:
        message = getattr(error, "description", "Resource not found")
        return (
            jsonify(
                {
                    "success": False,
                    "error": {
                        "code": "NOT_FOUND",
                        "message": message,
                        "path": request.path,
                    },
                }
            ),
            404,
        )

    @app.errorhandler(405)
    def handle_method_not_allowed(error: Any) -> Tuple[Dict[str, Any], int]:
        return (
            jsonify(
                {
                    "success": False,
                    "error": {
                        "code": "METHOD_NOT_ALLOWED",
                        "message": f"Method {request.method} is not allowed for this endpoint.",
                    },
                }
            ),
            405,
        )

    @app.errorhandler(422)
    def handle_unprocessable_entity(error: Any) -> Tuple[Dict[str, Any], int]:
        data = getattr(error, "data", None)
        messages = data.get("messages") if data else getattr(error, "description", "Unprocessable Entity")
        return (
            jsonify(
                {
                    "success": False,
                    "error": {
                        "code": "UNPROCESSABLE_ENTITY",
                        "message": "Semantic validation error occurred.",
                        "details": messages,
                    },
                }
            ),
            422,
        )

    @app.errorhandler(ValidationError)
    def handle_marshmallow_validation_error(error: ValidationError) -> Tuple[Dict[str, Any], int]:
        return (
            jsonify(
                {
                    "success": False,
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": "Input validation failed.",
                        "details": error.messages,
                    },
                }
            ),
            422,
        )

    @app.errorhandler(500)
    def handle_internal_server_error(error: Any) -> Tuple[Dict[str, Any], int]:
        logger.exception("Internal server error: %s", error)
        return (
            jsonify(
                {
                    "success": False,
                    "error": {
                        "code": "INTERNAL_SERVER_ERROR",
                        "message": "An unexpected error occurred on the server.",
                    },
                }
            ),
            500,
        )

    @app.errorhandler(HTTPException)
    def handle_generic_http_exception(error: HTTPException) -> Tuple[Dict[str, Any], int]:
        return (
            jsonify(
                {
                    "success": False,
                    "error": {
                        "code": error.name.upper().replace(" ", "_"),
                        "message": error.description,
                    },
                }
            ),
            error.code or 500,
        )


def register_blueprints(app: Flask) -> None:
    """
    Register all application blueprints with the /api prefix.
    Discovers standard modular blueprints dynamically if defined in the project.
    """
    # Register core API blueprint
    app.register_blueprint(api_bp)

    # Modular feature blueprints mapping: (module_path, blueprint_attr_name, url_prefix)
    blueprints_to_register = [
        # Primary API package blueprints
        ("app.api.auth", "auth_bp", "/api/auth"),
        ("app.api.products", "products_bp", "/api/products"),
        ("app.api.categories", "categories_bp", "/api/categories"),
        ("app.api.cart", "cart_bp", "/api/cart"),
        ("app.api.orders", "orders_bp", "/api/orders"),
        ("app.api.wallet", "wallet_bp", "/api/wallet"),
        ("app.api.admin", "admin_bp", "/api/admin"),
        ("app.api.search", "search_bp", "/api/search"),
        ("app.api.delivery", "delivery_bp", "/api/delivery"),
        ("app.api.vendors", "vendors_bp", "/api/vendors"),
        # Alternate route package fallbacks
        ("app.routes.auth", "auth_bp", "/api/auth"),
        ("app.routes.users", "users_bp", "/api/users"),
        ("app.routes.products", "products_bp", "/api/products"),
        ("app.routes.categories", "categories_bp", "/api/categories"),
        ("app.routes.orders", "orders_bp", "/api/orders"),
        ("app.routes.cart", "cart_bp", "/api/cart"),
        ("app.routes.suppliers", "suppliers_bp", "/api/suppliers"),
        ("app.routes.retailers", "retailers_bp", "/api/retailers"),
        ("app.routes.payments", "payments_bp", "/api/payments"),
    ]

    registered_names = set(app.blueprints.keys())
    for module_path, attr_name, prefix in blueprints_to_register:
        try:
            mod = importlib.import_module(module_path)
            bp = getattr(mod, attr_name)
            if bp.name not in registered_names:
                app.register_blueprint(bp, url_prefix=prefix)
                registered_names.add(bp.name)
                app.logger.info("Successfully registered blueprint '%s' at prefix '%s'", bp.name, prefix)
        except (ImportError, AttributeError) as exc:
            # Blueprints that have not been implemented yet are gracefully skipped
            app.logger.debug("Blueprint '%s' from '%s' not loaded: %s", attr_name, module_path, exc)


def create_app(config_name: Optional[str] = None) -> Flask:
    """
    Application Factory for FoodX B2B Marketplace.

    Args:
        config_name: Name of the configuration environment ('development', 'production', 'testing').
                     Defaults to FLASK_ENV environment variable or 'development'.

    Returns:
        Configured Flask application instance.
    """
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    config_class = config_by_name.get(config_name, DevelopmentConfig)

    app = Flask(__name__)
    app.config.from_object(config_class)

    # Ensure upload directory exists for product images and media
    upload_folder = app.config.get("UPLOAD_FOLDER")
    if upload_folder:
        os.makedirs(upload_folder, exist_ok=True)

    # Initialize extensions with application instance
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", "*")}},
        supports_credentials=True,
    )

    # Configure JWT callback error handlers
    register_jwt_handlers(jwt)

    # Register centralized error handlers
    register_error_handlers(app)

    # Register API blueprints
    register_blueprints(app)

    return app
