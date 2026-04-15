"""
Flask application configuration
"""

class Config:
    """Base configuration"""
    DEBUG = False
    TESTING = False
    JSON_SORT_KEYS = False

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    JSON_SORT_KEYS = False

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True

# Add this inside your Config class or just in the file
SQLALCHEMY_DATABASE_URI = 'postgresql://user:password@flask_db:5432/flaskdb'
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Flask needs this to secure user logins
SECRET_KEY = 'my-super-secret-fyp-key'