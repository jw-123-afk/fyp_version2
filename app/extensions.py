"""
Flask extensions initialization
"""
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# This file can be used to initialize Flask extensions if needed in the future
# For now, the DLP Chatbot uses minimal external dependencies
