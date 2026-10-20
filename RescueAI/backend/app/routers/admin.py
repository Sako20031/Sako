from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..models import Analysis, AuditLog, Medication, ProtocolDocument, ReferenceRevision, User
from ..schemas.api import MedicationIn, ProtocolIn, UserCreate
from ..security import audit, hash_password, require_role
from ..services import references, storage
from .references import med_dict

router = APIRouter(prefix="/api/admin", tags=["admin"])
admin_only = require_role("admin")


@router.post("/users", status_code=201)
def create_user(body: UserCreate, user: User = Depends(admin_only), db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.username == body.username)):
        raise HTTPException(409, "username_taken")
    u = User(username=body.username, password_hash=hash_password(body.password), role=body.role)
    db.add(u)
    db.flush()
    audit(db, user.id, "user_create", "user", u.id, role=body.role)
    db.commit()
    return {"id": u.id, "username": u.username, "role": u.role}


def _snapshot(db: Session, obj, kind: str, user: User, d: dict) -> None:
    db.add(ReferenceRevision(object_type=kind, object_id=obj.id, revision=obj.revision,
                             snapshot=d, changed_by=user.id))


def _verify_fields(obj, status: str, user: User) -> None:
    if status == "current":
        obj.last_verified = date.today()
        if hasattr(obj, "verified_by"):
            obj.verified_by = user.username


@router.put("/protocols/{slug}")
def upsert_protocol(slug: str, body: ProtocolIn, user: User = Depends(admin_only), db: Session = Depends(get_db)):
    if body.slug != slug:
        raise HTTPException(422, "slug_mismatch")
    if body.status == "current" and not body.source_url:
        raise HTTPException(422, "current_requires_source_url")
    data = body.model_dump()
    data["publication_date"] = date.fromisoformat(data["publication_date"]) if data["publication_date"] else None
    p = db.scalar(select(ProtocolDocument).where(ProtocolDocument.slug == slug))
    if p is None:
        p = ProtocolDocument(**data)
        db.add(p)
    else:
        for k, v in data.items():
            setattr(p, k, v)
        p.revision += 1
    _verify_fields(p, body.status, user)
    db.flush()
    _snapshot(db, p, "protocol", user, references.protocol_dict(p))
    audit(db, user.id, "protocol_upsert", "protocol", p.id, status=body.status, revision=p.revision)
    db.commit()
    return references.protocol_dict(p)


@router.put("/medications/{name}")
def upsert_medication(name: str, body: MedicationIn, user: User = Depends(admin_only), db: Session = Depends(get_db)):
    if body.generic_name != name:
        raise HTTPException(422, "name_mismatch")
    if body.fields.get("dosing") and not (body.source_url and body.source_title):
        raise HTTPException(422, "dosing_requires_source")
    if body.status == "current" and not body.source_url:
        raise HTTPException(422, "current_requires_source_url")
    m = db.scalar(select(Medication).where(Medication.generic_name == name))
    if m is None:
        m = Medication(**body.model_dump())
        db.add(m)
    else:
        for k, v in body.model_dump().items():
            setattr(m, k, v)
        m.revision += 1
    _verify_fields(m, body.status, user)
    db.flush()
    _snapshot(db, m, "medication", user, med_dict(m))
    audit(db, user.id, "medication_upsert", "medication", m.id, status=body.status, revision=m.revision)
    db.commit()
    return med_dict(m)


@router.get("/revisions/{object_id}")
def revisions(object_id: str, _: User = Depends(require_role("admin", "auditor")), db: Session = Depends(get_db)):
    rows = db.scalars(select(ReferenceRevision).where(ReferenceRevision.object_id == object_id)
                      .order_by(ReferenceRevision.revision))
    return [{"revision": r.revision, "changed_by": r.changed_by, "changed_at": r.changed_at.isoformat(),
             "snapshot": r.snapshot} for r in rows]


@router.get("/audit")
def audit_log(offset: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200),
              _: User = Depends(require_role("admin", "auditor")), db: Session = Depends(get_db)):
    rows = db.scalars(select(AuditLog).order_by(AuditLog.id.desc()).offset(offset).limit(limit))
    return [{"ts": r.ts.isoformat(), "user_id": r.user_id, "action": r.action, "object_type": r.object_type,
             "object_id": r.object_id, "detail": r.detail} for r in rows]


def purge_expired(db: Session, now: datetime | None = None) -> int:
    cutoff = (now or datetime.now(timezone.utc)) - timedelta(days=get_settings().retention_days)
    n = 0
    for a in db.scalars(select(Analysis)):
        created = a.created_at if a.created_at.tzinfo else a.created_at.replace(tzinfo=timezone.utc)
        if created < cutoff:
            storage.delete(a.original_path)
            for r in a.reviews:
                db.delete(r)
            db.delete(a)
            n += 1
    return n


@router.post("/retention/run")
def run_retention(user: User = Depends(admin_only), db: Session = Depends(get_db)):
    n = purge_expired(db)
    audit(db, user.id, "retention_run", purged=n, retention_days=get_settings().retention_days)
    db.commit()
    return {"purged_analyses": n, "retention_days": get_settings().retention_days}
