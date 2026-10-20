"""Database models.

Patient-identifying data lives only in `Encounter.patient_ref` (optional, free text
chosen by the clinician) and in saved images. Audit logs never store clinical content.
"""
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import JSON, Boolean, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(128))
    # paramedic: own encounters; admin: reference library + users; auditor: audit log read-only
    role: Mapped[str] = mapped_column(String(16), default="paramedic")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Encounter(Base):
    __tablename__ = "encounters"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    patient_ref: Mapped[str | None] = mapped_column(String(64), nullable=True)
    age_years: Mapped[float | None] = mapped_column(nullable=True)
    sex: Mapped[str] = mapped_column(String(16), default="unknown")
    pregnancy: Mapped[str] = mapped_column(String(16), default="unknown")
    chief_complaint: Mapped[str | None] = mapped_column(Text, nullable=True)
    onset: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # Each vital is null when not measured. Null is "unknown", never "normal".
    vitals: Mapped[dict] = mapped_column(JSON, default=dict)
    history: Mapped[str | None] = mapped_column(Text, nullable=True)
    allergies: Mapped[str | None] = mapped_column(Text, nullable=True)
    medications: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Free-form provenance labels for each field: clinician | voice | ai | confirmed
    provenance: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(16), default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    analyses: Mapped[list["Analysis"]] = relationship(back_populates="encounter")


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    encounter_id: Mapped[str | None] = mapped_column(ForeignKey("encounters.id"), nullable=True, index=True)
    task_type: Mapped[str] = mapped_column(String(32))
    # completed | failed | unavailable | rejected_quality | refused | invalid_output
    status: Mapped[str] = mapped_column(String(24))
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    clinical_context: Mapped[dict] = mapped_column(JSON, default=dict)
    input_meta: Mapped[dict] = mapped_column(JSON, default=dict)
    triage: Mapped[dict] = mapped_column(JSON, default=dict)
    # Original, unmodified AI output (validated). Never edited after creation.
    ai_output: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    provider: Mapped[str | None] = mapped_column(String(32), nullable=True)
    model: Mapped[str | None] = mapped_column(String(64), nullable=True)
    pipeline_version: Mapped[str] = mapped_column(String(32))
    original_path: Mapped[str | None] = mapped_column(String(256), nullable=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    encounter: Mapped[Encounter | None] = relationship(back_populates="analyses")
    reviews: Mapped[list["AnalysisReview"]] = relationship(
        back_populates="analysis", order_by="AnalysisReview.created_at"
    )


class AnalysisReview(Base):
    """Clinician review. Append-only: each review is a revision; the AI output is untouched."""

    __tablename__ = "analysis_reviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    analysis_id: Mapped[str] = mapped_column(ForeignKey("analyses.id"), index=True)
    reviewer_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(16))  # confirm | edit | incorrect
    edited_findings: Mapped[list | None] = mapped_column(JSON, nullable=True)
    final_assessment: Mapped[str | None] = mapped_column(Text, nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    analysis: Mapped[Analysis] = relationship(back_populates="reviews")


class DocumentationNote(Base):
    __tablename__ = "documentation_notes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    encounter_id: Mapped[str] = mapped_column(ForeignKey("encounters.id"), index=True)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    # {section: [{text, source: clinician|voice|ai|confirmed}]}
    sections: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(16), default="draft")  # draft | reviewed
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ProtocolDocument(Base):
    __tablename__ = "protocol_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    slug: Mapped[str] = mapped_column(String(96), unique=True)
    title: Mapped[str] = mapped_column(String(512))
    issuer: Mapped[str] = mapped_column(String(256))
    version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    publication_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    jurisdiction: Mapped[str] = mapped_column(String(64))  # KZ | international | EU | US ...
    source_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    language: Mapped[str] = mapped_column(String(8), default="en")
    topics: Mapped[list] = mapped_column(JSON, default=list)
    sections: Mapped[list] = mapped_column(JSON, default=list)  # [{title, summary}]
    last_verified: Mapped[date | None] = mapped_column(Date, nullable=True)
    verified_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="unverified")  # current | superseded | unverified
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Medication(Base):
    __tablename__ = "medications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    generic_name: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    brand_names: Mapped[list] = mapped_column(JSON, default=list)
    drug_class: Mapped[str | None] = mapped_column(String(128), nullable=True)
    # Clinical fields: indications, contraindications, precautions, adverse_effects,
    # interactions, routes, dosing, max_dose, monitoring, pediatric, pregnancy.
    # A field that is absent is shown as "not available", never inferred.
    fields: Mapped[dict] = mapped_column(JSON, default=dict)
    source_title: Mapped[str | None] = mapped_column(String(512), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    protocol_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    last_verified: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="unverified")
    revision: Mapped[int] = mapped_column(Integer, default=1)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class ReferenceRevision(Base):
    """Version history for protocol and medication entries (full snapshot per change)."""

    __tablename__ = "reference_revisions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    object_type: Mapped[str] = mapped_column(String(16))  # protocol | medication
    object_id: Mapped[str] = mapped_column(String(36), index=True)
    revision: Mapped[int] = mapped_column(Integer)
    snapshot: Mapped[dict] = mapped_column(JSON)
    changed_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    user_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(64))
    object_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    object_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    # Non-clinical metadata only (status codes, counts). Never patient data.
    detail: Mapped[dict] = mapped_column(JSON, default=dict)
