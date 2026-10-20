import json

from fastapi import (APIRouter, BackgroundTasks, Depends, File, Form, Header, HTTPException, Response,
                     UploadFile)
from pydantic import BaseModel, ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..models import Analysis, AnalysisReview, User
from ..schemas.api import ClinicalContext, ReviewIn
from ..security import audit, current_user, limiter
from ..services import pipeline, report, storage, triage
from ..services.ai.base import PIPELINE_VERSION, AIRequest
from ..services.media import ALLOWED, UploadRejected, sniff, validate_and_prepare
from .encounters import get_owned

router = APIRouter(prefix="/api", tags=["analyses"])
IMAGE_TASKS = {"ecg", "skin", "wound"}


class TriageIn(BaseModel):
    task: str = "symptoms"
    context: ClinicalContext


@router.post("/triage")
def run_triage(body: TriageIn, user: User = Depends(current_user)):
    """Instant danger-sign evaluation. No AI, no image."""
    return triage.evaluate(body.task, body.context.vitals.model_dump(), body.context.flags)


def _existing(db: Session, user: User, key: str | None) -> Analysis | None:
    if not key:
        return None
    return db.scalar(select(Analysis).where(Analysis.owner_id == user.id, Analysis.idempotency_key == key))


def _accepted(a: Analysis) -> dict:
    return {"id": a.id, "status": a.status, "task_type": a.task_type, "triage": a.triage,
            "quality": (a.input_meta or {}).get("quality")}


@router.post("/analyses", status_code=202)
async def create_image_analysis(
    background: BackgroundTasks,
    response: Response,
    task_type: str = Form(...),
    context: str = Form("{}"),
    encounter_id: str | None = Form(None),
    save_original: bool = Form(False),
    file: UploadFile = File(...),
    original: UploadFile | None = File(None),
    idempotency_key: str | None = Header(None, max_length=64),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if task_type not in IMAGE_TASKS:
        raise HTTPException(422, "invalid_task_type")
    try:
        ctx = ClinicalContext.model_validate(json.loads(context or "{}"))
    except (json.JSONDecodeError, ValidationError):
        raise HTTPException(422, "invalid_context")
    if (prior := _existing(db, user, idempotency_key)) is not None:
        response.status_code = 200
        return _accepted(prior)
    if encounter_id:
        get_owned(db, user, encounter_id)
    s = get_settings()
    limiter.check(f"analysis:{user.id}", s.rate_limit_analyses_per_minute)

    # Triage first: computed from clinician input before the file is even read.
    tri = triage.evaluate(task_type, ctx.vitals.model_dump(), ctx.flags)

    data = await file.read(s.max_upload_mb * 1024 * 1024 + 1)
    try:
        media = validate_and_prepare(data, task_type)
    except UploadRejected as e:
        audit(db, user.id, "upload_rejected", reason=e.code)
        db.commit()
        raise HTTPException(422, {"code": e.code, "triage": tri})

    a = Analysis(owner_id=user.id, encounter_id=encounter_id, task_type=task_type, status="processing",
                 clinical_context=ctx.model_dump(), triage=tri, pipeline_version=PIPELINE_VERSION,
                 idempotency_key=idempotency_key,
                 input_meta={"media_type": media.media_type, "width": media.width, "height": media.height,
                             "pages": media.pages, "bytes": len(media.original),
                             "transformations": media.transformations, "quality": media.quality,
                             "analysis_media_type": media.analysis_media_type})
    if save_original:
        # The client may send the untouched original separately from an edited analysis copy.
        orig = media.original
        if original is not None:
            orig = await original.read(s.max_upload_mb * 1024 * 1024 + 1)
            if sniff(orig) not in ALLOWED or len(orig) > s.max_upload_mb * 1024 * 1024:
                raise HTTPException(422, {"code": "original_invalid", "triage": tri})
        a.original_path = storage.save_original(orig)
    db.add(a)
    db.flush()
    audit(db, user.id, "analysis_create", "analysis", a.id, task=task_type, saved_original=save_original)
    db.commit()

    req = AIRequest(task=task_type, language=ctx.language, context=ctx.model_dump(),
                    media_bytes=media.analysis_bytes, media_type=media.analysis_media_type)
    background.add_task(pipeline.run, a.id, req, media.quality)
    return _accepted(a)


@router.post("/analyses/symptoms", status_code=202)
async def create_symptom_analysis(
    body: ClinicalContext, background: BackgroundTasks, response: Response,
    encounter_id: str | None = None,
    idempotency_key: str | None = Header(None, max_length=64),
    user: User = Depends(current_user), db: Session = Depends(get_db),
):
    if (prior := _existing(db, user, idempotency_key)) is not None:
        response.status_code = 200
        return _accepted(prior)
    if encounter_id:
        get_owned(db, user, encounter_id)
    limiter.check(f"analysis:{user.id}", get_settings().rate_limit_analyses_per_minute)
    tri = triage.evaluate("symptoms", body.vitals.model_dump(), body.flags)
    a = Analysis(owner_id=user.id, encounter_id=encounter_id, task_type="symptoms", status="processing",
                 clinical_context=body.model_dump(), triage=tri, pipeline_version=PIPELINE_VERSION,
                 idempotency_key=idempotency_key, input_meta={"quality": {"assessed": False, "level": "not_applicable"}})
    db.add(a)
    db.flush()
    audit(db, user.id, "analysis_create", "analysis", a.id, task="symptoms")
    db.commit()
    req = AIRequest(task="symptoms", language=body.language, context=body.model_dump())
    background.add_task(pipeline.run, a.id, req, {})
    return _accepted(a)


def _owned_analysis(db: Session, user: User, analysis_id: str) -> Analysis:
    a = db.get(Analysis, analysis_id)
    if not a or (a.owner_id != user.id and user.role != "admin"):
        raise HTTPException(404, "not_found")
    return a


@router.get("/analyses/{analysis_id}")
def get_analysis(analysis_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    a = _owned_analysis(db, user, analysis_id)
    pipeline.expire_stale(db, a)
    return report.build(db, a)


@router.post("/analyses/{analysis_id}/review")
def review(analysis_id: str, body: ReviewIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    a = _owned_analysis(db, user, analysis_id)
    if a.status == "processing":
        raise HTTPException(409, "analysis_in_progress")
    db.add(AnalysisReview(analysis_id=a.id, reviewer_id=user.id, **body.model_dump()))
    audit(db, user.id, "analysis_review", "analysis", a.id, review_action=body.action)
    db.commit()
    db.refresh(a)
    return report.build(db, a)


@router.get("/analyses/{analysis_id}/original")
def original(analysis_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    a = _owned_analysis(db, user, analysis_id)
    if not a.original_path:
        raise HTTPException(404, "original_not_saved")
    audit(db, user.id, "original_download", "analysis", a.id)
    db.commit()
    data = storage.read(a.original_path)
    return Response(data, media_type=sniff(data) or "application/octet-stream",
                    headers={"Cache-Control": "private, no-store"})
