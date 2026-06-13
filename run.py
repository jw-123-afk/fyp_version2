import os
import sys

print("=== [CHECKPOINT 1] Script started. Initializing imports... ===", flush=True)

try:
    print("=== [CHECKPOINT 2] Importing create_app and db... ===", flush=True)
    from app import create_app
    from app.extensions import db
    
    print("=== [CHECKPOINT 3] Importing models... ===", flush=True)
    from app import models

    print("=== [CHECKPOINT 4] Calling create_app()... ===", flush=True)
    app = create_app()

    print("=== [CHECKPOINT 5] Entering app_context to create tables... ===", flush=True)
    with app.app_context():
        print("=== [CHECKPOINT 6] Triggering db.create_all()... ===", flush=True)
        db.create_all()
        print("=== [CHECKPOINT 7] Database tables verified/created successfully! ===", flush=True)

except Exception as e:
    print(f"!!! CRITICAL APP CRASH DURING BOOT: {e} !!!", flush=True)
    import traceback
    traceback.print_exc()
    sys.exit(1)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    print(f"=== [CHECKPOINT 8] Attempting to bind to 0.0.0.0 on port {port}... ===", flush=True)
    app.run(host='0.0.0.0', port=port, debug=False)