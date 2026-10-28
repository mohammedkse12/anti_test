"""
FoodX B2B Marketplace - Application Entry Point.

This script launches the Flask development server using the Application Factory pattern.
For production deployments, execute with a WSGI server such as Gunicorn:
    gunicorn -w 4 -b 0.0.0.0:5000 "run:app"
"""

import os
from app import create_app

# Create application instance using FLASK_ENV or default to development
env = os.getenv("FLASK_ENV", "development")
app = create_app(env)

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 3000))
    debug = app.config.get("DEBUG", False)

    app.logger.info("Starting FoodX Backend on %s:%d (env: %s, debug: %s)", host, port, env, debug)
    app.run(host=host, port=port, debug=debug)
