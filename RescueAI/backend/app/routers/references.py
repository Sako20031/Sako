import hashlib
import json

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Medication, ProtocolDocument, User
from ..security import current_user
from ..services import references
from ..services.triage import load_rules

router = APIRouter(prefix="/api/references", tags=["references"])

MED_FIELDS = ["indications", "contraindications", "precautions", "adverse_effects", "interactions",
              "routes", "dosing", "max_dose", "monitoring", "pediatric", "pregnancy"]


def med_dict(m: Medication) -> dict:
    return {"generic_name": m.generic_name, "brand_names": m.brand_names, "drug_class": m.drug_class,
            # Every field is present; missing ones are explicitly null ("not available").
            "fields": {f: m.fields.get(f) for f in MED_FIELDS},
            "source_title": m.source_title, "source_url": m.source_url,
            "protocol_version": m.protocol_version,
            "last_verified": m.last_verified.isoformat() if m.last_verified else None,
            "status": m.status, "revision": m.revision,
            "dosing_verified": m.status == "current" and bool(m.fields.get("dosing")) and bool(m.source_url)}


@router.get("/protocols")
def protocols(q: str | None = Query(None, max_length=100), topic: str | None = None,
              offset: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=50),
              _: User = Depends(current_user), db: Session = Depends(get_db)):
    total, rows = references.search(db, q, topic, offset, limit)
    return {"total": total, "items": [references.protocol_dict(r) for r in rows],
            "kz_verified_count": sum(1 for r in db.scalars(select(ProtocolDocument))
                                     if r.status == "current" and r.jurisdiction == "KZ")}


@router.get("/protocols/{slug}")
def protocol(slug: str, _: User = Depends(current_user), db: Session = Depends(get_db)):
    p = db.scalar(select(ProtocolDocument).where(ProtocolDocument.slug == slug))
    if not p:
        raise HTTPException(404, "not_found")
    return references.protocol_dict(p)


@router.get("/medications")
def medications(q: str | None = Query(None, max_length=100), offset: int = Query(0, ge=0),
                limit: int = Query(20, ge=1, le=50), _: User = Depends(current_user),
                db: Session = Depends(get_db)):
    stmt = select(Medication).order_by(Medication.generic_name)
    if q:
        stmt = stmt.where(or_(Medication.generic_name.ilike(f"%{q}%"), Medication.drug_class.ilike(f"%{q}%")))
    rows = list(db.scalars(stmt))
    return {"total": len(rows), "items": [med_dict(m) for m in rows[offset: offset + limit]]}


def _bundle(db: Session) -> dict:
    return {"protocols": [references.protocol_dict(p) for p in db.scalars(select(ProtocolDocument).order_by(ProtocolDocument.slug))],
            "medications": [med_dict(m) for m in db.scalars(select(Medication).order_by(Medication.generic_name))],
            "triage_rules": load_rules()}


@router.get("/bundle")
def bundle(request: Request, response: Response, _: User = Depends(current_user), db: Session = Depends(get_db)):
    """Everything the offline reference needs, with an ETag so unchanged data is not re-sent."""
    body = _bundle(db)
    raw = json.dumps(body, sort_keys=True, ensure_ascii=False).encode()
    etag = '"' + hashlib.sha256(raw).hexdigest()[:32] + '"'
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers={"ETag": etag})
    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = "private, no-cache"
    return {**body, "version": etag.strip('"'), "bytes": len(raw)}
