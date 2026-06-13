import os
import sys


# Print a message so we know the script actually started
print("Starting Application Boot Process...", flush=True)


try:
    from app import create_app
    from app.extensions import db
    from app import models  # MUST import models so SQLAlchemy knows what to create


    app = create_app()


    # 🛑 THE MAGIC FIX: Create all database tables before starting
    with app.app_context():
        db.create_all()
        print("Database tables created successfully!", flush=True)


except Exception as e:
    print(f"CRITICAL APP CRASH DURING BOOT: {e}", flush=True)
    sys.exit(1)


if __name__ == '__main__':
    # Grab the port, default to 5000
    port = int(os.environ.get("PORT", 5000))
    print(f"Attempting to bind to 0.0.0.0 on port {port}...", flush=True)
   
    # Run the app directly
    app.run(host='0.0.0.0', port=port, debug=False)
