from groq import Groq
from .dlp_knowledge_base import load_pdf_knowledge
import pypdf
import io
import os

# 🛑 THE HEAVY AI IMPORTS HAVE BEEN REMOVED FROM HERE 🛑

# ⚠️ SECURITY WARNING: Never push your real API key to the GitHub Organization!
# It is highly recommended to use os.getenv("GROQ_API_KEY") for your final submission.
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

try:
    client = Groq(api_key=GROQ_API_KEY)
except Exception as e:
    print(f"Groq Initialization Error: {e}")
    client = None

# =====================================================================
# 1. INITIALIZE RAG (RETRIEVAL-AUGMENTED GENERATION) ENGINE
# =====================================================================
vector_store = None

# 🛑 MEMORY BYPASS FOR RENDER FREE TIER 🛑
if os.getenv("SKIP_FAISS") == "true":
    print("Cloud Environment Detected: Skipping local FAISS build and heavy imports to save RAM.", flush=True)
else:
    # THE HEAVY IMPORTS ARE NOW HIDING HERE!
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain_community.vectorstores import FAISS
    from langchain_huggingface import HuggingFaceEmbeddings

    print("Loading PDF Documents...", flush=True)
    PDF_CONTEXT = load_pdf_knowledge()

    if PDF_CONTEXT and PDF_CONTEXT.strip():
        print("Chunking text for Vector Database...", flush=True)
        # Break the massive text into overlapping chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ".", " ", ""]
        )
        chunks = text_splitter.split_text(PDF_CONTEXT)

        # Download the open-source embedding model and index the text
        print("Building FAISS Vector Database... (This may take a moment on first run)", flush=True)
        try:
            embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
            vector_store = FAISS.from_texts(chunks, embeddings)
            print("Superchat AI is Ready!", flush=True)
        except Exception as e:
            print(f"Error building Vector Database: {e}", flush=True)
    else:
        print("WARNING: No PDF documents loaded. AI will not have legal context.", flush=True)


# =====================================================================
# 2. MAIN CHATBOT LOGIC (NOW WITH CONVERSATIONAL MEMORY)
# =====================================================================
def process_query(user_query, chat_history=[]):
    """
    Processes the user query with RAG and conversational memory.
    chat_history expects: [("user msg", "bot reply"), ("user msg", "bot reply")]
    """
    if not client:
        return "Error: AI Client not initialized. Check your API key."

    # INSTANT GREETING INTERCEPTOR
    clean_message = user_query.lower().strip()
    basic_greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'hi there', 'hello there', 'who are you', 'how are you']
    
    if clean_message in basic_greetings:
        return "Hello! I am your Superchat Legal Assistant. I can help you understand your Defect Liability Period (DLP), review your SPA clauses, or calculate your claim timelines. How can I help you today?"

    # INTELLIGENT RETRIEVAL (RAG)
    # Search the vector database for the 4 most relevant chunks
    safe_context = "No legal documents available."
    if vector_store:
        try:
            # We combine the last user message with the new query so FAISS understands the context of the search
            search_query = user_query
            if chat_history:
                search_query = f"{chat_history[-1][0]} {user_query}"
                
            relevant_docs = vector_store.similarity_search(search_query, k=4)
            safe_context = "\n\n---\n\n".join([doc.page_content for doc in relevant_docs])
        except Exception as e:
            print(f"Vector search error: {e}")

    # SYSTEM PROMPT
    system_prompt = f"""You are 'Superchat', a specialized legal assistant for Malaysian Property Law.
    Read the following official legal document excerpts carefully.
    
    Rules for responding:
    1. If the user is just making small talk, reply politely and concisely, then offer to help with property law. Do NOT append the legal disclaimer for basic small talk.
    2. For property law questions, answer using ONLY the provided Document Text.
    3. If it is a legal question and the Document Text does not contain the answer, strictly reply: "I don't have sufficient information from the uploaded legal documents to answer this."
    4. End every legal-related response with: "This is not legal advice. Please consult a qualified lawyer."

    Document Text (Extracted Context):
    {safe_context}
    """

    # =====================================================================
    # BUILD THE MEMORY ARRAY FOR GROQ
    # =====================================================================
    messages = [{"role": "system", "content": system_prompt}]
    
    # Loop through the database history and feed it to the AI brain
    for past_user_msg, past_bot_msg in chat_history:
        messages.append({"role": "user", "content": past_user_msg})
        messages.append({"role": "assistant", "content": past_bot_msg})
        
    # Finally, append the brand new question
    messages.append({"role": "user", "content": user_query})

    try:
        chat_completion = client.chat.completions.create(
            messages=messages,
            model="llama-3.3-70b-versatile",
            temperature=0.3
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        return f"AI Error: {str(e)}"
        

# =====================================================================
# 3. EXTRA UTILITY FUNCTIONS
# =====================================================================
def analyze_legal_text(document_text):
    if not client: return "Error: AI Client not initialized."
    try:
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": f"Analyze this legal text briefly:\n\n{document_text}"}],
            model="llama-3.3-70b-versatile",
            temperature=0.1
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Analysis Error: {str(e)}"

def analyze_defect_image(base64_image):
    """Sends an image to Groq's Vision Model for defect analysis."""
    if not client: return "Error: AI Client not initialized."
    
    prompt = """You are examining a photo of a potential property defect in Malaysia.
    1. Describe in detail what you see in the image (location, type of damage, severity, materials affected).
    2. Classify the visible issue: hairline crack / structural crack / water stain / tile hollow / peeling paint / leaking / uneven surface / other.
    3. Estimate approximate severity: minor / moderate / serious.
    4. Based on Malaysian Housing Development Act and common DLP practice:
       - Is this the type of defect that is USUALLY covered during the 24-month Defect Liability Period?
       - Give short reasoning using typical DLP rules.
    5. Suggest next steps for the user.
    Image description task only — do not give definitive legal ruling."""

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            temperature=0.1
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        return f"Vision AI Error: {str(e)}"

def analyze_pdf_document(pdf_bytes):
    """Extracts text from a PDF and sends it to Groq for legal summarization."""
    if not client: return "Error: AI Client not initialized."
    
    try:
        # 1. Read the PDF
        pdf_file = io.BytesIO(pdf_bytes)
        reader = pypdf.PdfReader(pdf_file)
        extracted_text = ""
        
        for page in reader.pages:
            text = page.extract_text()
            if text:
                extracted_text += text + "\n"
        
        if not extracted_text.strip():
            return "Error: Could not read text from this PDF. It might be a scanned image rather than a text document."

        # 2. Limit text size for the AI (first 30,000 characters)
        safe_text = extracted_text[:30000]

        # 3. Create the legal summarization prompt
        prompt = f"""You are a specialized legal assistant for Malaysian Property Law.
        Please read the following extracted text from a user's uploaded legal document (like an SPA or Defect Report).
        
        1. Provide a clear, structured summary of the document.
        2. Highlight any key clauses related to the Defect Liability Period (DLP), warranties, or property conditions.
        3. Identify any immediate red flags, deadlines, or actionable steps for the buyer.
        
        Document Text:
        {safe_text}
        """

        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            temperature=0.1
        )
        return chat_completion.choices[0].message.content
        
    except Exception as e:
        return f"PDF Analysis Error: {str(e)}"