"""Analysis pipeline: triage first (synchronous, instant), AI second (background)."""
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import SessionLocal
from ..models import Analysis
from . import safety
from .ai.base import PIPELINE_VERSION, AIRequest
from .ai.registry import get_provider

log = logging.getLogger("rescue.pipeline")

TERMINAL = {"completed", "failed", "unavailable", "refused", "invalid_output", "rejected_quality"}


async def run(analysis_id: str, req: AIRequest, quality: dict) -> None:
    """Background job. Always ends in a terminal status, including on unexpected errors."""
    db: Session = SessionLocal()
    try:
        a = db.get(Analysis, analysis_id)
        if a is None:
            return
        s = get_settings()
        provider = get_provider()
        if req.media_bytes and provider.name != "none" and not s.ai_external_images_authorized:
            a.status, a.error_code, a.provider = "unavailable", "external_images_not_authorized", provider.name
            db.commit()
            return
        try:
            result = await provider.analyze(req)
        except Exception:  # noqa: BLE001 - a crash must never look like success
            log.exception("provider crashed")
            a.status, a.error_code = "failed", "internal_error"
            db.commit()
            return

        a.provider, a.model = result.provider, result.model
        if result.status != "completed" or result.findings is None:
            a.status = result.status if result.status != "completed" else "invalid_output"
            a.error_code = result.error_code or "no_findings"
            db.commit()
            return

        a.ai_output = result.findings.model_dump()
        view = safety.apply(req.task, result.findings, a.triage, quality)
        a.input_meta = {**a.input_meta, "safety": view}
        uninterpretable = "input_uninterpretable" in view["safety_flags"]
        a.status = "rejected_quality" if uninterpretable else "completed"
        a.error_code = "input_uninterpretable" if uninterpretable else None
        db.commit()
    finally:
        db.close()


def expire_stale(db: Session, a: Analysis) -> None:
    """A job lost to a server restart is reported as failed, not left 'processing'."""
    if a.status != "processing":
        return
    limit = timedelta(seconds=get_settings().ai_timeout_seconds * (get_settings().ai_max_retries + 1) + 60)
    created = a.created_at if a.created_at.tzinfo else a.created_at.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) - created > limit:
        a.status, a.error_code = "failed", "job_lost_or_timed_out"
        db.commit()


__all__ = ["run", "expire_stale", "PIPELINE_VERSION", "TERMINAL"]
