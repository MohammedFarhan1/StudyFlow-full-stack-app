
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from dataclasses import dataclass
from typing import Optional, Any, Dict
try:
    from pypdf import PdfReader
except Exception:
    PdfReader = None

try:
    import multipart  # type: ignore
    MULTIPART_AVAILABLE = True
except Exception:
    MULTIPART_AVAILABLE = False
import json
import os

from dotenv import load_dotenv
from groq import Groq
import firebase_admin
from firebase_admin import auth as firebase_auth, credentials

from models import (
    AnswerKeyRequest,
    ScheduleRequest,
    Syllabus,
    SyllabusTodo,
    TodoItem,
)
from scheduler import generate_structured_schedule
from ics_generator import generate_ics
from answer_key_generator import generate_answer_key_book_pdf

# -----------------------------------
# App Init
# -----------------------------------

load_dotenv()

if not os.getenv("GROQ_API_KEY"):
    raise RuntimeError("GROQ_API_KEY not found in environment")

# --------------------
# Firebase Admin Auth
# --------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FIREBASE_SERVICE_ACCOUNT_PATH = os.getenv(
    "FIREBASE_SERVICE_ACCOUNT_PATH",
    "studyflow-b360d-firebase-adminsdk.json",
)
if not os.path.isabs(FIREBASE_SERVICE_ACCOUNT_PATH):
    FIREBASE_SERVICE_ACCOUNT_PATH = os.path.join(
        BASE_DIR,
        FIREBASE_SERVICE_ACCOUNT_PATH,
    )

def _init_firebase_admin() -> None:
    if firebase_admin._apps:
        return
    if not os.path.exists(FIREBASE_SERVICE_ACCOUNT_PATH):
        raise RuntimeError(
            "Firebase service account file not found. "
            "Set FIREBASE_SERVICE_ACCOUNT_PATH to your JSON file."
        )
    cred = credentials.Certificate(FIREBASE_SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)

security = HTTPBearer(auto_error=False)
DEV_ALLOW_ANON = os.getenv("DEV_ALLOW_ANON", "").lower() in {"1", "true", "yes", "on"}


def _parse_cors_origins(raw: str) -> list[str]:
    origins: list[str] = []
    for value in raw.split(","):
        origin = value.strip().rstrip("/")
        if origin:
            origins.append(origin)
    return origins


DEFAULT_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://0.0.0.0:3000",
]
DEFAULT_CORS_ORIGIN_REGEX = (
    r"^https?://(?:localhost|127\.0\.0\.1|0\.0\.0\.0|(?:\d{1,3}\.){3}\d{1,3})(?::\d+)?$"
)
CORS_ALLOW_ORIGINS = _parse_cors_origins(os.getenv("CORS_ALLOW_ORIGINS", ""))
if not CORS_ALLOW_ORIGINS:
    CORS_ALLOW_ORIGINS = DEFAULT_CORS_ORIGINS.copy()
CORS_ALLOW_ORIGIN_REGEX = os.getenv(
    "CORS_ALLOW_ORIGIN_REGEX",
    DEFAULT_CORS_ORIGIN_REGEX,
).strip() or None

def get_current_user(
    auth_credentials: HTTPAuthorizationCredentials = Depends(security),
):
    if auth_credentials is None or auth_credentials.scheme.lower() != "bearer":
        if DEV_ALLOW_ANON:
            return {"uid": "dev-anon"}
        raise HTTPException(status_code=401, detail="Missing authentication token")
    _init_firebase_admin()
    try:
        return firebase_auth.verify_id_token(auth_credentials.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

# --------------------
# Config
# --------------------
MODEL_NAME = "llama-3.1-8b-instant"

# --------------------
# App
# --------------------
app = FastAPI(title="StudyFlow API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_origin_regex=CORS_ALLOW_ORIGIN_REGEX,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

ICS_PATH = "study_schedule.ics"
ANSWER_KEY_DIR = os.path.join(BASE_DIR, "generated_answer_keys")
os.makedirs(ANSWER_KEY_DIR, exist_ok=True)

# In-memory storage (OK for now)
@dataclass
class UserState:
    syllabus_text: Optional[str] = None
    syllabus_structured: Optional[Syllabus] = None
    answer_key_path: Optional[str] = None


USER_STATES: Dict[str, UserState] = {}


def _get_user_id(user: Dict[str, Any]) -> str:
    user_id = user.get("uid") or user.get("user_id") or user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unable to resolve user ID")
    return str(user_id)


def _get_user_state(user: Dict[str, Any]) -> UserState:
    user_id = _get_user_id(user)
    if user_id not in USER_STATES:
        USER_STATES[user_id] = UserState()
    return USER_STATES[user_id]


def _safe_user_fragment(user_id: str) -> str:
    safe = "".join(ch if ch.isalnum() or ch in {"-", "_"} else "_" for ch in user_id)
    return safe[:80] or "user"


def _answer_key_path_for_user(user_id: str) -> str:
    return os.path.join(ANSWER_KEY_DIR, f"answer_key_{_safe_user_fragment(user_id)}.pdf")


# -----------------------------------
# PDF Utils (kept local for clarity)
# -----------------------------------

def extract_text_from_pdf(file) -> str:
    if PdfReader is None:
        raise HTTPException(
            status_code=500,
            detail="PDF support requires pypdf. Install it and restart the server.",
        )
    reader = PdfReader(file)
    text_parts = []

    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text_parts.append(page_text)

    return "\n".join(text_parts).strip()


def _validate_syllabus(data: Dict[str, Any]) -> Syllabus:
    if hasattr(Syllabus, "model_validate"):
        return Syllabus.model_validate(data)
    return Syllabus.parse_obj(data)


def extract_structured_syllabus(text: str) -> Syllabus:
    trimmed = text.strip()
    if not trimmed:
        raise HTTPException(status_code=400, detail="Syllabus text is empty")

    prompt = (
        "Extract the course syllabus into strict JSON with this schema:\n"
        "{\n"
        '  "course_title": string,\n'
        '  "units": [\n'
        "    {\n"
        '      "number": string,\n'
        '      "title": string,\n'
        '      "topics": [\n'
        "        {\n"
        '          "title": string,\n'
        '          "subtopics": [ { "title": string } ]\n'
        "        }\n"
        "      ]\n"
        "    }\n"
        "  ]\n"
        "}\n"
        "Rules:\n"
        "- Return only JSON (no markdown or commentary).\n"
        "- If numbering is missing, infer sequential numbers starting at 1.\n"
        "- Keep titles concise; use best effort.\n"
        "- If subtopics are not present, include an empty array.\n"
        "\n"
        "SYLLABUS TEXT:\n"
    )

    completion = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": "You are a strict JSON generator."},
            {"role": "user", "content": prompt + trimmed[:8000]},
        ],
        temperature=0.1,
        max_tokens=1500,
    )

    content = completion.choices[0].message.content or ""
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="LLM returned invalid JSON for syllabus extraction",
        )

    return _validate_syllabus(data)


def build_syllabus_todo(syllabus: Syllabus) -> SyllabusTodo:
    items: list[TodoItem] = []

    for unit in syllabus.units:
        unit_item = TodoItem(
            title=f"Unit {unit.number}: {unit.title}".strip(),
            level="unit",
            children=[]
        )

        for topic in unit.topics:
            topic_item = TodoItem(
                title=topic.title,
                level="topic",
                children=[]
            )

            for subtopic in topic.subtopics:
                topic_item.children.append(
                    TodoItem(
                        title=subtopic.title,
                        level="subtopic",
                        children=[]
                    )
                )

            unit_item.children.append(topic_item)

        items.append(unit_item)

    return SyllabusTodo(course_title=syllabus.course_title, items=items)


# -----------------------------------
# Routes
# -----------------------------------

@app.get("/")
def root():
    return {
        "message": "StudyFlow API running",
        "endpoints": [
            "/upload-syllabus",
            "/syllabus-status",
            "/syllabus-todo",
            "/preview-schedule",
            "/generate-schedule",
            "/download-schedule",
            "/generate-answer-key-book",
            "/download-answer-key-book",
        ]
    }


@app.get("/ui", response_class=HTMLResponse)
def ui():
    return """
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>StudyFlow Test UI</title>
    <style>
      :root {
        color-scheme: light;
      }
      body {
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        margin: 24px;
        background: #f6f7fb;
        color: #1f2937;
      }
      h1 {
        margin: 0 0 12px;
      }
      .card {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.04);
      }
      label {
        display: block;
        font-weight: 600;
        margin-bottom: 6px;
      }
      input[type="file"] {
        margin-bottom: 8px;
      }
      textarea {
        width: 100%;
        min-height: 220px;
        font-family: "Consolas", "Courier New", monospace;
        font-size: 13px;
      }
      button {
        background: #2563eb;
        color: #fff;
        border: none;
        border-radius: 6px;
        padding: 8px 12px;
        cursor: pointer;
        margin-right: 8px;
      }
      button.secondary {
        background: #6b7280;
      }
      .row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .log {
        background: #0f172a;
        color: #e2e8f0;
        padding: 10px;
        border-radius: 6px;
        font-family: "Consolas", "Courier New", monospace;
        white-space: pre-wrap;
        min-height: 72px;
      }
      a.button-link {
        display: inline-block;
        background: #059669;
        color: #fff;
        padding: 8px 12px;
        border-radius: 6px;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <h1>StudyFlow Test UI</h1>

    <div class="card">
      <label>1) Upload syllabus PDF</label>
      <input id="pdf" type="file" accept="application/pdf" />
      <div class="row">
        <button id="upload">Upload PDF</button>
        <button id="status" class="secondary">Check Status</button>
      </div>
    </div>

    <div class="card">
      <label>2) Generate schedule (JSON)</label>
      <div class="row">
        <input id="slot-start" type="text" value="09:00 AM" />
        <input id="slot-end" type="text" value="10:00 AM" />
        <button id="add-slot" class="secondary">Add Time Slot</button>
      </div>
      <textarea id="payload">{
  "start_date": "2026-02-04",
  "end_date": "2026-02-06",
  "time_slots": [
    { "start": "09:00 AM", "end": "10:00 AM" }
  ],
  "timezone": "Asia/Kolkata"
}</textarea>
      <div class="row">
        <button id="generate">Generate Schedule</button>
        <a class="button-link" href="/download-schedule" target="_blank">Download ICS</a>
      </div>
    </div>

    <div class="card">
      <label>3) Syllabus Todo (JSON)</label>
      <div class="row">
        <button id="todo">Generate Todo</button>
      </div>
      <textarea id="todo-output" readonly></textarea>
    </div>

    <div class="card">
      <label>Logs</label>
      <div id="log" class="log">Ready.</div>
    </div>

    <script>
      const log = (msg) => {
        const el = document.getElementById("log");
        el.textContent = typeof msg === "string" ? msg : JSON.stringify(msg, null, 2);
      };

      document.getElementById("upload").addEventListener("click", async () => {
        const file = document.getElementById("pdf").files[0];
        if (!file) {
          log("Pick a PDF first.");
          return;
        }
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/upload-syllabus", { method: "POST", body: form });
        const data = await res.json().catch(() => ({}));
        log(data);
      });

      document.getElementById("status").addEventListener("click", async () => {
        const res = await fetch("/syllabus-status");
        const data = await res.json().catch(() => ({}));
        log(data);
      });

      document.getElementById("generate").addEventListener("click", async () => {
        let payload;
        try {
          payload = JSON.parse(document.getElementById("payload").value);
        } catch (e) {
          log("Invalid JSON payload.");
          return;
        }
        const res = await fetch("/generate-schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        log(data);
      });

      document.getElementById("add-slot").addEventListener("click", () => {
        let payload;
        try {
          payload = JSON.parse(document.getElementById("payload").value);
        } catch (e) {
          log("Invalid JSON payload.");
          return;
        }
        if (!payload.time_slots) {
          payload.time_slots = [];
        }
        const start = document.getElementById("slot-start").value || "09:00 AM";
        const end = document.getElementById("slot-end").value || "10:00 AM";
        payload.time_slots.push({ start, end });
        document.getElementById("payload").value = JSON.stringify(payload, null, 2);
        log(`Added time slot ${start} - ${end}`);
      });

      document.getElementById("todo").addEventListener("click", async () => {
        const res = await fetch("/syllabus-todo");
        const data = await res.json().catch(() => ({}));
        document.getElementById("todo-output").value = JSON.stringify(data, null, 2);
        log(data);
      });
    </script>
  </body>
</html>
"""


# --------- PDF UPLOAD (NEW) ---------

if MULTIPART_AVAILABLE:
    @app.post("/upload-syllabus")
    async def upload_syllabus(
        file: UploadFile = File(...),
        _user: Dict[str, Any] = Depends(get_current_user),
    ):
        state = _get_user_state(_user)

        if file.content_type != "application/pdf":
            raise HTTPException(
                status_code=400,
                detail="Only PDF files are allowed"
            )

        try:
            state.syllabus_text = extract_text_from_pdf(file.file)
            state.syllabus_structured = None

            if not state.syllabus_text:
                raise HTTPException(
                    status_code=400,
                    detail="PDF contains no extractable text (likely scanned)"
                )

            return {
                "message": "Syllabus uploaded successfully",
                "characters_extracted": len(state.syllabus_text),
                "preview": state.syllabus_text[:500]
            }

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to process PDF: {str(e)}"
            )
else:
    @app.post("/upload-syllabus")
    async def upload_syllabus_disabled(
        _user: Dict[str, Any] = Depends(get_current_user),
    ):
        raise HTTPException(
            status_code=501,
            detail="File uploads require python-multipart in the active Python environment.",
        )


@app.get("/syllabus-status")
def syllabus_status(
    _user: Dict[str, Any] = Depends(get_current_user),
):
    state = _get_user_state(_user)
    return {
        "uploaded": bool(state.syllabus_text),
        "length": len(state.syllabus_text) if state.syllabus_text else 0
    }


# --------- SYLLABUS TODO ---------

@app.get("/syllabus-todo", response_model=SyllabusTodo)
def syllabus_todo(
    _user: Dict[str, Any] = Depends(get_current_user),
):
    state = _get_user_state(_user)
    if not state.syllabus_text:
        raise HTTPException(
            status_code=400,
            detail="Upload a syllabus PDF first"
        )

    if not state.syllabus_structured:
        state.syllabus_structured = extract_structured_syllabus(state.syllabus_text)

    return build_syllabus_todo(state.syllabus_structured)


# --------- PREVIEW SCHEDULE ---------

@app.post("/preview-schedule")
def preview_schedule(
    req: ScheduleRequest,
    _user: Dict[str, Any] = Depends(get_current_user),
):
    state = _get_user_state(_user)

    if not req.syllabus:
        if not state.syllabus_text:
            raise HTTPException(
                status_code=400,
                detail="Upload a syllabus PDF first or provide structured syllabus",
            )
        if not state.syllabus_structured:
            state.syllabus_structured = extract_structured_syllabus(state.syllabus_text)
        req.syllabus = state.syllabus_structured

    events = generate_structured_schedule(req)
    return {"events": events}


# --------- SCHEDULE + ICS ---------

@app.post("/generate-schedule")
def generate_schedule(
    req: ScheduleRequest,
    _user: Dict[str, Any] = Depends(get_current_user),
):
    state = _get_user_state(_user)

    if not req.syllabus:
        if not state.syllabus_text:
            raise HTTPException(
                status_code=400,
                detail="Upload a syllabus PDF first or provide structured syllabus",
            )
        if not state.syllabus_structured:
            state.syllabus_structured = extract_structured_syllabus(state.syllabus_text)
        req.syllabus = state.syllabus_structured

    events = generate_structured_schedule(req)

    if not events:
        raise HTTPException(
            status_code=400,
            detail="No events generated from syllabus"
        )

    ics_data = generate_ics(
        events=events,
        course_title=req.syllabus.course_title,
        timezone=req.timezone
    )

    with open(ICS_PATH, "wb") as f:
        f.write(ics_data)

    return {
        "message": "Schedule generated successfully",
        "events_created": len(events)
    }


@app.post("/generate-answer-key-book")
def generate_answer_key_book(
    req: AnswerKeyRequest,
    _user: Dict[str, Any] = Depends(get_current_user),
):
    state = _get_user_state(_user)
    user_id = _get_user_id(_user)

    syllabus = req.syllabus
    if not syllabus:
        if not state.syllabus_text:
            raise HTTPException(
                status_code=400,
                detail="Upload a syllabus PDF first or provide structured syllabus",
            )
        if not state.syllabus_structured:
            state.syllabus_structured = extract_structured_syllabus(state.syllabus_text)
        syllabus = state.syllabus_structured

    output_path = _answer_key_path_for_user(user_id)

    try:
        result = generate_answer_key_book_pdf(
            syllabus=syllabus,
            llm_client=client,
            model_name=MODEL_NAME,
            output_path=output_path,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate answer key book: {str(e)}",
        )

    state.answer_key_path = output_path

    return {
        "message": "Answer key book generated successfully",
        "sections_generated": result["sections_generated"],
    }


@app.get("/download-schedule")
def download_schedule(
    _user: Dict[str, Any] = Depends(get_current_user),
):
    return FileResponse(
        ICS_PATH,
        media_type="text/calendar",
        filename="StudySchedule.ics"
    )


@app.get("/download-answer-key-book")
def download_answer_key_book(
    _user: Dict[str, Any] = Depends(get_current_user),
):
    state = _get_user_state(_user)
    user_id = _get_user_id(_user)
    answer_key_path = state.answer_key_path or _answer_key_path_for_user(user_id)

    if not os.path.exists(answer_key_path):
        raise HTTPException(status_code=404, detail="Generate answer key book first")

    return FileResponse(
        answer_key_path,
        media_type="application/pdf",
        filename="AnswerKeyBook.pdf",
    )
