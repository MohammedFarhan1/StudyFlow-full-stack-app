# StudyFlow

StudyFlow is a full-stack syllabus planner:
- Upload a syllabus PDF
- Generate a study schedule and download ICS
- Build a syllabus todo structure
- Generate an answer key PDF

## Tech Stack

- Backend: FastAPI (Python)
- Frontend: Next.js 16 (React 19, TypeScript)
- Auth: Firebase
- LLM: Groq API

## Project Structure

```text
StudyFlow/
  main.py
  requirements.txt
  .env.example
  frontend/
    src/
    package.json
    .env.local.example
```

## Prerequisites

1. Python 3.10+ (recommended 3.11+)
2. Node.js 20+ and npm
3. A Groq API key
4. Firebase project setup:
   - Web app config (for frontend env)
   - Service account JSON (for backend token verification)

## Setup (Windows PowerShell)

### 1. Clone

```powershell
git clone https://github.com/<your-username>/StudyFlow.git
cd StudyFlow
```

### 2. Backend Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env` and set:
- `GROQ_API_KEY`
- `FIREBASE_SERVICE_ACCOUNT_PATH` (usually `studyflow-b360d-firebase-adminsdk.json`)
- `DEV_ALLOW_ANON=1` for local testing (optional)

Place your Firebase admin JSON file in project root (same folder as `main.py`) or update `FIREBASE_SERVICE_ACCOUNT_PATH`.

### 3. Frontend Setup

```powershell
cd frontend
npm install
Copy-Item .env.local.example .env.local
```

Edit `frontend/.env.local` with your Firebase web app values.

### 4. Run Backend

Open terminal 1 (project root):

```powershell
cd StudyFlow
.\.venv\Scripts\Activate.ps1
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 5. Run Frontend

Open terminal 2:

```powershell
cd StudyFlow\frontend
npm run dev
```

Open `http://localhost:3000`.

## Setup (macOS / Linux)

### 1. Backend

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
```

### 3. Run

```bash
# terminal 1 (root)
source .venv/bin/activate
uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# terminal 2 (frontend)
cd frontend
npm run dev
```

## Common Issues

1. `Failed to fetch`
- Confirm backend is running on `http://127.0.0.1:8000`.
- Confirm `NEXT_PUBLIC_API_BASE` in `frontend/.env.local`.

2. `PDF contains no extractable text (likely scanned)`
- The PDF is image-only/scanned.
- Run OCR first, then upload.

3. `Missing authentication token`
- Use Firebase login in frontend, or set `DEV_ALLOW_ANON=1` in backend `.env` for local testing.

## Requirements

Backend dependencies are managed in `requirements.txt`:
- fastapi
- uvicorn
- pypdf
- python-multipart
- pydantic
- python-dateutil
- icalendar
- pytz
- groq
- python-dotenv
- firebase-admin
- reportlab

Install with:

```bash
pip install -r requirements.txt
```

## Push to GitHub (First Time)

Run in project root:

```powershell
# one-time cleanup if frontend has its own git history
if (Test-Path frontend/.git) { Remove-Item -Recurse -Force frontend/.git }

git init
git add .
git commit -m "Initial commit: StudyFlow full-stack app"
git branch -M main
git remote add origin https://github.com/<your-username>/StudyFlow.git
git push -u origin main
```

## Security Notes

1. Never commit:
- `.env`
- `frontend/.env.local`
- Firebase admin JSON files

2. Keep API keys private and rotate them if accidentally exposed.
