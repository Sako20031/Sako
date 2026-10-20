"""RESCUE AI backend."""
import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .db import Base, engine
from .routers import admin, analyses, auth, encounters, references
from .services.ai.base import PIPELINE_VERSION, UNAVAILABLE_MESSAGE
from .services.ai.registry import get_provider
from .services.triage import load_rules

logging.basicConfig(level=logging.INFO)
settings = get_settings()
app = FastAPI(title="RESCUE AI API", version="0.1.0",
              docs_url="/api/docs" if settings.environment != "production" else None,
              openapi_url="/api/openapi.json")

if settings.environment != "production":
    Base.metadata.create_all(engine)  # production uses Alembic migrations

if settings.cors_origins:
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True,
                       allow_methods=["GET", "POST", "PUT", "DELETE"], allow_headers=["*"])

app.add_middleware(GZipMiddleware, minimum_size=1024)

MAX_BODY = (settings.max_upload_mb + 1) * 1024 * 1024


@app.middleware("http")
async def guards(request: Request, call_next):
    cl = request.headers.get("content-length")
    if cl and cl.isdigit() and int(cl) > MAX_BODY:
        return JSONResponse({"detail": "request_too_large"}, status_code=413)
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()")
    if request.url.path.startswith("/api/") and "cache-control" not in response.headers:
        response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    # Field locations and error types only: never echo submitted (possibly clinical) values.
    errs = [{"loc": e.get("loc"), "type": e.get("type")} for e in exc.errors()]
    return JSONResponse({"detail": "validation_error", "errors": errs}, status_code=422)


@app.exception_handler(Exception)
async def unhandled(_: Request, exc: Exception):
    logging.getLogger("rescue").exception("unhandled error")
    return JSONResponse({"detail": "internal_error"}, status_code=500)


for r in (auth.router, encounters.router, analyses.router, references.router, admin.router):
    app.include_router(r)


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/status")
def status():
    """Public, non-sensitive: tells the UI what is genuinely operational."""
    p = get_provider()
    h = p.health()
    rules = load_rules()
    return {
        "ai": {**h, "external_images_authorized": settings.ai_external_images_authorized,
               "image_analysis_available": h["available"] and settings.ai_external_images_authorized,
               "text_analysis_available": h["available"],
               "unavailable_message": None if h["available"] else UNAVAILABLE_MESSAGE},
        "pipeline_version": PIPELINE_VERSION,
        "triage_rules": {"version": rules["version"], "status": rules["status"]},
        "environment": settings.environment,
    }


@app.api_route("/api/{rest:path}", methods=["GET", "POST", "PUT", "DELETE"], include_in_schema=False)
def api_not_found(rest: str):
    raise HTTPException(404, "not_found")


# Serve the built PWA from the same origin (cookie auth with SameSite=Strict needs it).
DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        f = (DIST / path).resolve()
        if path and f.is_file() and DIST in f.parents:
            headers = {"Cache-Control": "no-cache"} if path in ("sw.js", "manifest.webmanifest") else {}
            return FileResponse(f, headers=headers)
        return FileResponse(DIST / "index.html", headers={"Cache-Control": "no-cache"})
