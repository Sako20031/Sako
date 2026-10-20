from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Analysis, DocumentationNote, Encounter, User
from ..schemas.api import EncounterIn
from ..security import audit, current_user
from ..services import documentation, storage

router = APIRouter(prefix="/api/encounters", tags=["encounters"])


def to_dict(e: Encounter, full: bool = True) -> dict:
    d = {"id": e.id, "patient_ref": e.patient_ref, "chief_complaint": e.chief_complaint,
         "status": e.status, "created_at": e.created_at.isoformat(), "updated_at": e.updated_at.isoformat()}
    if full:
        d.update({"age_years": e.age_years, "sex": e.sex, "pregnancy": e.pregnancy, "onset": e.onset,
                  "vitals": e.vitals, "history": e.history, "allergies": e.allergies,
                  "medications": e.medications, "notes": e.notes, "provenance": e.provenance,
                  "analyses": [{"id": a.id, "task_type": a.task_type, "status": a.status,
                                "created_at": a.created_at.isoformat()} for a in e.analyses]})
    return d


def get_owned(db: Session, user: User, encounter_id: str) -> Encounter:
    e = db.get(Encounter, encounter_id)
    # Paramedics see only their own encounters; 404 (not 403) avoids confirming existence.
    if not e or (e.owner_id != user.id and user.role != "admin"):
        raise HTTPException(404, "not_found")
    return e


@router.post("", status_code=201)
def create(body: EncounterIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    data = body.model_dump()
    data["vitals"] = body.vitals.model_dump()
    e = Encounter(owner_id=user.id, **data)
    db.add(e)
    db.flush()
    audit(db, user.id, "encounter_create", "encounter", e.id)
    db.commit()
    return to_dict(e)


@router.get("")
def list_(offset: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=50),
          user: User = Depends(current_user), db: Session = Depends(get_db)):
    q = select(Encounter).where(Encounter.owner_id == user.id)
    total = db.scalar(select(func.count()).select_from(q.subquery()))
    rows = db.scalars(q.order_by(Encounter.created_at.desc()).offset(offset).limit(limit))
    return {"total": total, "items": [to_dict(e, full=False) for e in rows]}


@router.get("/{encounter_id}")
def read(encounter_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    e = get_owned(db, user, encounter_id)
    audit(db, user.id, "encounter_read", "encounter", e.id)
    db.commit()
    return to_dict(e)


@router.put("/{encounter_id}")
def update(encounter_id: str, body: EncounterIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    e = get_owned(db, user, encounter_id)
    if e.status == "final":
        raise HTTPException(409, "encounter_finalized")
    for k, v in body.model_dump().items():
        setattr(e, k, v)
    e.vitals = body.vitals.model_dump()
    audit(db, user.id, "encounter_update", "encounter", e.id)
    db.commit()
    return to_dict(e)


@router.delete("/{encounter_id}")
def delete(encounter_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    e = get_owned(db, user, encounter_id)
    n = 0
    for a in list(e.analyses):
        storage.delete(a.original_path)
        for r in a.reviews:
            db.delete(r)
        db.delete(a)
        n += 1
    for note in db.scalars(select(DocumentationNote).where(DocumentationNote.encounter_id == e.id)):
        db.delete(note)
    db.delete(e)
    audit(db, user.id, "encounter_delete", "encounter", encounter_id, analyses_deleted=n)
    db.commit()
    return {"deleted": True, "analyses_deleted": n}


@router.post("/{encounter_id}/documentation")
def draft_documentation(encounter_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    e = get_owned(db, user, encounter_id)
    note = DocumentationNote(encounter_id=e.id, author_id=user.id, sections=documentation.draft(e))
    db.add(note)
    db.flush()
    audit(db, user.id, "documentation_draft", "encounter", e.id)
    db.commit()
    return {"id": note.id, "status": note.status, "sections": note.sections}


@router.post("/{encounter_id}/documentation/{note_id}/review")
def review_documentation(encounter_id: str, note_id: str, body: dict,
                         user: User = Depends(current_user), db: Session = Depends(get_db)):
    e = get_owned(db, user, encounter_id)
    note = db.get(DocumentationNote, note_id)
    if not note or note.encounter_id != e.id:
        raise HTTPException(404, "not_found")
    sections = body.get("sections")
    if not isinstance(sections, dict):
        raise HTTPException(422, "sections_required")
    note.sections = documentation.mark_reviewed(sections)
    note.status = "reviewed"
    note.reviewed_at = datetime.now(timezone.utc)
    audit(db, user.id, "documentation_review", "encounter", e.id)
    db.commit()
    return {"id": note.id, "status": note.status, "sections": note.sections}


@router.get("/{encounter_id}/documentation/{note_id}/export")
def export_documentation(encounter_id: str, note_id: str, user: User = Depends(current_user),
                         db: Session = Depends(get_db)):
    e = get_owned(db, user, encounter_id)
    note = db.get(DocumentationNote, note_id)
    if not note or note.encounter_id != e.id:
        raise HTTPException(404, "not_found")
    if note.status != "reviewed":
        raise HTTPException(409, "review_required_before_export")
    audit(db, user.id, "documentation_export", "encounter", e.id)
    db.commit()
    return {"text": documentation.to_text(note.sections)}
