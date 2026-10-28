"""
FoodX B2B Marketplace - Application Extensions.

Initializes Flask extensions without binding them to an application instance,
adhering to the Flask Application Factory pattern. Extensions are bound
to the Flask app inside create_app().
"""

from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base model class for SQLAlchemy 2.0 declarative models."""
    pass


# Database ORM instance (SQLAlchemy 2.0 compatible)
db: SQLAlchemy = SQLAlchemy(model_class=Base)

# Database migration management
migrate: Migrate = Migrate()

# JSON Web Token authentication manager
jwt: JWTManager = JWTManager()

# Cross-Origin Resource Sharing handler
cors: CORS = CORS()
