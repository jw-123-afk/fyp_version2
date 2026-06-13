import os
import sys

# Print a message so we know the script actually started in the Render logs
print("Starting Application Boot Process...", flush=True)

try:
    from app import create_app
    app = create_app()
except Exception as e:
    print(f"CRITICAL APP CRASH DURING BOOT: {e}", flush=True)
    sys.exit(1)

if __name__ == '__main__':
    # Grab Render's dynamic port, default to 10000
    port = int(os.environ.get("PORT", 10000))
    print(f"Attempting to bind to 0.0.0.0 on port {port}...", flush=True)
    
    # Run the app directly, bypassing the 'flask run' command line tool
    app.run(host='0.0.0.0', port=port, debug=False)