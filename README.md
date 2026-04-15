# Superchat DLP Chatbot

Superchat is a Flask web app for Malaysian property-law workflows around the Defect Liability Period (DLP). It combines a chat interface, user accounts, persistent conversation history, image/PDF analysis, and client-side tools for generating DLP reports and formal defect notice letters.

## What the project does

- Lets users register, log in, and keep chat history in PostgreSQL.
- Answers Malaysian property-law questions using legal PDFs loaded from `legal_documents/`.
- Analyzes uploaded defect images with Groq vision models.
- Summarizes uploaded legal PDFs such as SPAs or developer letters.
- Generates a client-side DLP assessment report from VP date, notice date, purchase price, and repair estimates.
- Generates a client-side formal notice letter for defects reporting.

## Stack

- Backend: Flask, Flask-SQLAlchemy
- Database: PostgreSQL
- AI: Groq API, Llama chat/vision models
- PDF parsing: PyMuPDF (`fitz`), `pypdf`
- Frontend: Jinja templates, vanilla JavaScript, CSS
- Containerization: Docker, Docker Compose, Conda-based image

## Project layout

```text
.
├── app/
│   ├── __init__.py              # Basic app factory and root route
│   ├── start_chatbot.py         # Main startup path with DB init
│   ├── chatbot_core.py          # Groq chat, image, and PDF analysis logic
│   ├── dlp_knowledge_base.py    # Loads PDF text from legal_documents/
│   ├── models.py                # User and Message tables
│   ├── extensions.py            # SQLAlchemy instance
│   ├── module1/routes.py        # Auth + API routes
│   ├── templates/               # index, login, register
│   └── static/                  # CSS, JS, logo
├── data/
│   └── conversations/           # JSON chat history helper storage
├── legal_documents/             # Source PDFs for legal context
├── Dockerfile
├── docker-compose.yml
├── environment.yml
└── requirements.txt
```

## Main features

### 1. Authentication and chat history

- `POST/GET /api/register`
- `POST/GET /api/login`
- `GET /api/logout`
- `GET /api/history`
- `DELETE /api/delete-chat/<chat_id>`
- `DELETE /api/clear-history`

Chat messages are stored in the `Message` table and grouped by `chat_id`.

### 2. Legal chatbot

- `POST /api/chat`

The chatbot reads text extracted from PDFs in `legal_documents/` at startup and sends the user query plus document context to Groq.

### 3. AI analysis endpoints

- `POST /api/analyze`
- `POST /api/analyze-image`
- `POST /api/analyze-pdf`
- `POST /api/feedback`

### 4. Browser tools in the UI

- Guidelines tab
- DLP assessment calculator
- Legal references tab
- Notice letter generator
- Image scanner
- PDF scanner

The calculator and notice-letter generator are implemented in the frontend and do not currently depend on backend storage.

## Local development

### Prerequisites

- Python 3.11 if running outside Docker
- PostgreSQL
- Groq API access

### Install dependencies

Using pip:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install flask_sqlalchemy psycopg2-binary pymupdf
```

Using Conda:

```bash
conda env update -n base -f environment.yml
```

### Database

The current code expects PostgreSQL at:

```text
postgresql://user:password@flask_db:5432/flaskdb
```

If you run locally without Docker, you will need to update that connection string in the app config/startup path or provide an equivalent host/database.

### Run the app

```bash
python3 app/start_chatbot.py
```

Then open `http://localhost:5000`.

## Docker

Build and start the app plus Postgres:

```bash
docker-compose up --build
```

Current port mapping:

- App: `http://localhost:5100`
- Postgres: `localhost:5432`

The compose file runs Flask with:

```text
FLASK_APP=app.start_chatbot:app
```

## Legal document loading

On startup, the app scans every PDF in `legal_documents/` and concatenates the extracted text into an in-memory knowledge base. If you add or replace PDFs, restart the app so the new context is loaded.

## Important implementation notes

- `requirements.txt` does not list every package used by the current code. In particular, the app also needs `flask_sqlalchemy`, `psycopg2-binary`, and `pymupdf`.
- `app/chatbot_core.py` currently contains a hardcoded Groq API key in source. This should be moved to environment variables before any real deployment.
- `SECRET_KEY` and database settings are also hardcoded.
- `app/dlp_knowledge_base.py` currently returns empty results for `get_all_guidelines()` and `get_all_legal_references()`, while the UI still exposes those sections.
- There is overlap between `app/__init__.py` and `app/start_chatbot.py`; the latter is the practical startup path for the database-backed app.

## Quick test checklist

1. Start PostgreSQL and the Flask app.
2. Open the app in the browser.
3. Register a new account and log in.
4. Send a chat message.
5. Upload one image in the scanner tab.
6. Upload one PDF in the PDF scanner tab.
7. Generate a DLP report and a notice letter from the UI forms.

## Verification

`python3 -m compileall app`
