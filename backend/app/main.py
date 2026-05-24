"""Main FastAPI application — The Orchestrator."""
import sys
import traceback

# Early debug print to confirm Python starts
print("[BOOT] Python started, importing modules...", flush=True)

try:
    from contextlib import asynccontextmanager
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from app.config import settings
    print("[BOOT] Config loaded OK", flush=True)
    from app.database import connect_db, close_db
    print("[BOOT] Database module loaded OK", flush=True)
    from app.routes import auth, posts, jobs, analyze, users
    print("[BOOT] All routes loaded OK", flush=True)
except Exception as e:
    print(f"[FATAL] Import error: {e}", flush=True)
    traceback.print_exc()
    sys.exit(1)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await connect_db()
    except Exception as e:
        print(f"[FATAL] Database connection failed: {e}", flush=True)
        traceback.print_exc()
    yield
    await close_db()


app = FastAPI(title="ResumeAI — LinkedIn-Style Platform", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all route modules
app.include_router(auth.router)
app.include_router(posts.router)
app.include_router(jobs.router)
app.include_router(analyze.router)
app.include_router(users.router)


@app.get("/")
async def root():
    return {"status": "ok", "app": "ResumeAI Platform", "version": "2.0.0"}
