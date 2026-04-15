from flask import Flask
from flask import Flask, render_template

# 1. Import your database tools and tables
from app.extensions import db
from app.models import User, Message

# 2. Import your routes (the Blueprint we updated earlier)
from app.module1.routes import module1

# 3. Create the Flask app
app = Flask(__name__)

# 4. Add configurations
app.config['SECRET_KEY'] = 'my-super-secret-fyp-key'  # Needed for logins!
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://user:password@flask_db:5432/flaskdb'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# 5. Initialize the database with the app
db.init_app(app)

# 6. Register the routes so the app knows about /login, /register, and /chat
app.register_blueprint(module1)

# 7. Create the tables
with app.app_context():
    db.create_all()
    print("Database tables connected and created!")

# THIS IS THE MISSING ROUTE!
@app.route('/')
def home():
    # This grabs app/templates/index.html and shows it to the user
    return render_template('index.html')


# 8. Run the app (Fixed the missing bracket!)
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)