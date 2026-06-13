import os
from flask import Flask, render_template
from .extensions import db  # Ensure your db object is imported here
from .module1.routes import module1


def create_app():
    app = Flask(__name__, static_folder='static', template_folder='templates')

    # ==========================================
    # DATABASE CONFIGURATION FOR DEPLOYMENT
    # ==========================================
    # Reads the database URL from Render environment variables.
    # Defaults to local SQLite if running locally.
    database_url = os.getenv('DATABASE_URL')
    
    if database_url:
        # Automatically fix the postgres protocol string prefix for SQLAlchemy
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    else:
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///local_project.db'

    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')

    # Initialize extensions inside the factory
    db.init_app(app)

    # Register blueprints
    app.register_blueprint(module1)

    # Base frontend index route
    @app.route('/')
    def index():
        return render_template('index.html')

    return app