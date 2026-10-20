"""Reference lookup and seeding. References attached to a report come only from the
library, never from model output, so a missing protocol cannot become an invented citation."""
import json
from datetime import date
from pathlib import Path

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..models import ProtocolDocument
from .triage import _rules_path

NO_PROTOCOL_MESSAGE = (
    "No verified applicable protocol is available in the current knowledge base. "
    "Consult the official protocol and appropriate clinical authority."
)

TASK_TOPICS = {"ecg": ["ecg", "acs", "arrhythmia", "resuscitation"],
               "skin": ["anaphylaxis", "skin"], "wound": ["trauma", "wound", "burn"],
               "symptoms": ["triage"]}


def protocol_dict(p: ProtocolDocument) -> dict:
    return {
        "slug": p.slug, "title": p.title, "issuer": p.issuer, "version": p.version,
        "publication_date": p.publication_date.isoformat() if p.publication_date else None,
        "jurisdiction": p.jurisdiction, "source_url": p.source_url, "language": p.language,
        "topics": p.topics, "sections": p.sections,
        "last_verified": p.last_verified.isoformat() if p.last_verified else None,
        "verified_by": p.verified_by, "status": p.status, "notes": p.notes, "revision": p.revision,
    }


def for_task(db: Session, task: str) -> dict:
    topics = TASK_TOPICS.get(task, [])
    docs = [p for p in db.scalars(select(ProtocolDocument)) if set(p.topics) & set(topics)]
    verified_kz = [d for d in docs if d.status == "current" and d.jurisdiction == "KZ"]
    verified_other = [d for d in docs if d.status == "current" and d.jurisdiction != "KZ"]
    unverified = [d for d in docs if d.status != "current"]
    return {
        "verified_kz": [protocol_dict(d) for d in verified_kz],
        "verified_other": [protocol_dict(d) for d in verified_other],
        "unverified": [protocol_dict(d) for d in unverified],
        # A foreign guideline is never silently presented in place of a KZ protocol.
        "kz_protocol_available": bool(verified_kz),
        "message": None if verified_kz else NO_PROTOCOL_MESSAGE,
    }


def search(db: Session, q: str | None, topic: str | None, offset: int, limit: int):
    stmt = select(ProtocolDocument).order_by(ProtocolDocument.title)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(ProtocolDocument.title.ilike(like), ProtocolDocument.issuer.ilike(like)))
    rows = list(db.scalars(stmt))
    if topic:
        rows = [r for r in rows if topic in r.topics]
    return len(rows), rows[offset: offset + limit]


def seed(db: Session) -> int:
    path = _rules_path().parent / "seed_protocols.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    added = 0
    for item in data["documents"]:
        if db.scalar(select(ProtocolDocument).where(ProtocolDocument.slug == item["slug"])):
            continue
        pub = item.get("publication_date")
        db.add(ProtocolDocument(**{**item, "publication_date": date.fromisoformat(pub) if pub else None}))
        added += 1
    db.commit()
    return added


def seed_path() -> Path:
    return _rules_path().parent / "seed_protocols.json"
