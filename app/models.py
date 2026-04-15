from app.extensions import db

# 1. The User Account Table
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)

# 2. The Upgraded Chat Message Table
class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.Text, nullable=False)
    sender = db.Column(db.String(10), nullable=False)
    timestamp = db.Column(db.DateTime, default=db.func.current_timestamp())
    
    # Links to the User table above
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Separates the different chat tabs
    chat_id = db.Column(db.String(50), nullable=False)