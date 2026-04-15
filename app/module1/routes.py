from flask import Blueprint, request, jsonify, render_template, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash

# === Database Imports ===
try:
    from app.extensions import db
    from app.models import Message, User
except Exception as e:
    print(f"DATABASE IMPORT ERROR: {e}")

# === Core Logic Imports (With Error Handling) ===
try:
    from ..chatbot_core import process_query, analyze_legal_text, analyze_defect_image, analyze_pdf_document
    from ..conversation_logger import save_history
    from ..dlp_knowledge_base import get_all_guidelines, get_all_legal_references
    from ..feedback_manager import save_feedback
except Exception as e:
    # Save the error string securely so it doesn't get deleted by Python
    error_msg = str(e)
    print(f"CRITICAL IMPORT ERROR: {error_msg}")
    
    # Dummy functions that safely return the REAL error to your chat screen
    process_query = lambda x: f"Backend Error: {error_msg}"
    analyze_legal_text = lambda x: f"Backend Error: {error_msg}"
    analyze_defect_image = lambda x: f"Backend Error: {error_msg}"
    analyze_pdf_document = lambda x: f"Backend Error: {error_msg}"
    
    save_history = lambda x: None
    get_all_guidelines = lambda: []
    get_all_legal_references = lambda: []

# Create the Blueprint (All routes below will automatically start with /api)
module1 = Blueprint('module1', __name__, url_prefix='/api')

# ==========================================
# 1. USER AUTHENTICATION ROUTES
# ==========================================

@module1.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        user_name = request.form.get('username')
        user_pass = request.form.get('password')

        # Check if that username is already taken
        existing_user = User.query.filter_by(username=user_name).first()
        if existing_user:
            return "Error: That username is already taken. Please go back and try another."

        # Scramble the password securely
        hashed_password = generate_password_hash(user_pass)

        # Create and save the new User
        new_user = User(username=user_name, password_hash=hashed_password)
        try:
            db.session.add(new_user)
            db.session.commit()
            return redirect(url_for('module1.login')) # Send them to login page after success
        except Exception as e:
            db.session.rollback()
            return f"Database Error: {e}"

    return render_template('register.html')

@module1.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        user_name = request.form.get('username')
        user_pass = request.form.get('password')

        user = User.query.filter_by(username=user_name).first()

        # Check if user exists AND password matches
        if user and check_password_hash(user.password_hash, user_pass):
            # Give them the VIP Wristband (Session)
            session['user_id'] = user.id
            session['username'] = user.username
            
            # Teleport them directly to the main chatbot UI
            return redirect('/') 
        else:
            return "Error: Invalid username or password."

    return render_template('login.html')

@module1.route('/logout')
def logout():
    # Rip off the VIP wristband to log them out
    session.clear()
    return redirect(url_for('module1.login'))


# ==========================================
# 2. CHATBOT CORE ROUTES & SECURE HISTORY
# ==========================================

@module1.route('/chat', methods=['POST'])
def api_chat():
    try:
        if 'user_id' not in session:
            return jsonify({"error": "Unauthorized! Please log in first."}), 401
            
        current_user_id = session['user_id']
        data = request.json
        message = data.get('message', '').strip()
        chat_id = str(data.get('chat_id', 'default'))
        
        if not message:
            return jsonify({"error": "Empty message"}), 400
            
        # 1. Save USER message
        try:
            user_msg = Message(text=message, sender='user', user_id=current_user_id, chat_id=chat_id)
            db.session.add(user_msg)
            db.session.commit()
            print(f"✅ DB SUCCESS: Saved user message for chat {chat_id}")
        except Exception as db_e:
            print(f"❌ CRITICAL DB ERROR (User Msg): {db_e}")
            db.session.rollback()

        # 2. Get AI response
        response_text = process_query(message)
        
        # 3. Save BOT message
        try:
            bot_msg = Message(text=response_text, sender='bot', user_id=current_user_id, chat_id=chat_id)
            db.session.add(bot_msg)
            db.session.commit()
            print(f"✅ DB SUCCESS: Saved bot message for chat {chat_id}")
        except Exception as db_e:
            print(f"❌ CRITICAL DB ERROR (Bot Msg): {db_e}")
            db.session.rollback()
            
        return jsonify({"response": response_text})
        
    except Exception as e:
        print(f"❌ ROUTE ERROR: {e}")
        return jsonify({"error": f"Server Error: {str(e)}"}), 500

@module1.route('/history', methods=['GET'])
def get_chat_history():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    current_user_id = session['user_id']
    user_messages = Message.query.filter_by(user_id=current_user_id).order_by(Message.timestamp).all()
    
    history_data = []
    for msg in user_messages:
        history_data.append({
            "chat_id": msg.chat_id,
            "sender": msg.sender,
            "text": msg.text,
            "timestamp": msg.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        })
        
    return jsonify({"history": history_data})

@module1.route('/delete-chat/<chat_id>', methods=['DELETE']) 
def delete_single_chat(chat_id):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    current_user_id = session['user_id']
    try:
        Message.query.filter_by(user_id=current_user_id, chat_id=chat_id).delete()
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@module1.route('/clear-history', methods=['DELETE']) 
def clear_all_history():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    current_user_id = session['user_id']
    try:
        Message.query.filter_by(user_id=current_user_id).delete()
        db.session.commit()
        return jsonify({"success": "All history deleted."})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
        
# ==========================================
# 3. ANALYSIS & DATA ROUTES
# ==========================================

@module1.route('/analyze', methods=['POST'])
def api_analyze():
    try:
        data = request.json
        text = data.get('message', '').strip()
        
        if not text:
            return jsonify({"error": "Empty text"}), 400
            
        response_text = analyze_legal_text(text)
        return jsonify({"response": response_text})
        
    except Exception as e:
        print(f"ANALYZE ERROR: {e}")
        return jsonify({"error": f"Server Error: {str(e)}"}), 500

@module1.route('/guidelines', methods=['GET'])
def api_guidelines():
    return jsonify({"guidelines": get_all_guidelines()})

@module1.route('/legal-references', methods=['GET'])
def api_legal_references():
    return jsonify({"references": get_all_legal_references()})

@module1.route('/analyze-image', methods=['POST'])
def api_analyze_image():
    try:
        data = request.json
        base64_image = data.get('image', '')
        
        if not base64_image:
            return jsonify({"error": "No image provided"}), 400
            
        if "," in base64_image:
            base64_image = base64_image.split(",")[1]
            
        response_text = analyze_defect_image(base64_image)
        return jsonify({"response": response_text})
        
    except Exception as e:
        print(f"VISION ERROR: {e}")
        return jsonify({"error": f"Server Error: {str(e)}"}), 500

@module1.route('/analyze-pdf', methods=['POST'])
def api_analyze_pdf():
    try:
        if 'pdf' not in request.files:
            return jsonify({"error": "No PDF file uploaded"}), 400
        
        pdf_file = request.files['pdf']
        
        if pdf_file.filename == '':
            return jsonify({"error": "No selected file"}), 400
            
        if not pdf_file.filename.lower().endswith('.pdf'):
            return jsonify({"error": "Invalid file format. Please upload a PDF."}), 400

        pdf_bytes = pdf_file.read()
        response_text = analyze_pdf_document(pdf_bytes)
        
        return jsonify({"response": response_text})
        
    except Exception as e:
        print(f"PDF ROUTE ERROR: {e}")
        return jsonify({"error": f"Server Error: {str(e)}"}), 500

@module1.route('/feedback', methods=['POST'])
def api_feedback():
    try:
        data = request.json
        feedback_text = data.get('feedback')
        rating = data.get('rating', 0) # Just in case you want to save the star rating too!
        
        save_feedback(feedback_text)
        return jsonify({"status": "Feedback saved successfully!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

        