from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Tri = Literal["yes", "no", "unknown"]


class VitalSigns(BaseModel):
    """All optional. Bounds reject impossible values (typos, unit mix-ups); they are not
    clinical thresholds."""

    model_config = ConfigDict(extra="forbid")
    heart_rate: float | None = Field(None, ge=0, le=350)
    sbp: float | None = Field(None, ge=0, le=320)
    dbp: float | None = Field(None, ge=0, le=250)
    resp_rate: float | None = Field(None, ge=0, le=90)
    spo2: float | None = Field(None, ge=0, le=100)
    temp_c: float | None = Field(None, ge=20, le=45)
    gcs: int | None = Field(None, ge=3, le=15)
    glucose_mmol: float | None = Field(None, ge=0, le=60)
    consciousness: Literal["A", "C", "V", "P", "U"] | None = None
    pain_score: int | None = Field(None, ge=0, le=10)


class ClinicalContext(BaseModel):
    model_config = ConfigDict(extra="forbid")
    language: Literal["ru", "kk", "en"] = "ru"
    flags: list[str] = Field(default_factory=list, max_length=64)
    vitals: VitalSigns = Field(default_factory=VitalSigns)
    age_years: float | None = Field(None, ge=0, le=125)
    sex: Literal["male", "female", "unknown"] = "unknown"
    pregnancy: Literal["yes", "no", "unknown", "not_applicable"] = "unknown"
    chief_complaint: str | None = Field(None, max_length=2000)
    onset: str | None = Field(None, max_length=200)
    body_location: str | None = Field(None, max_length=200)
    # Task-specific structured answers, e.g. {"itching": "yes", "fever": "unknown"}
    answers: dict[str, str] = Field(default_factory=dict, max_length=64)
    notes: str | None = Field(None, max_length=4000)
    workflow: str | None = Field(None, max_length=64)


class EncounterIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    patient_ref: str | None = Field(None, max_length=64)
    age_years: float | None = Field(None, ge=0, le=125)
    sex: Literal["male", "female", "unknown"] = "unknown"
    pregnancy: Literal["yes", "no", "unknown", "not_applicable"] = "unknown"
    chief_complaint: str | None = Field(None, max_length=2000)
    onset: str | None = Field(None, max_length=200)
    vitals: VitalSigns = Field(default_factory=VitalSigns)
    history: str | None = Field(None, max_length=4000)
    allergies: str | None = Field(None, max_length=2000)
    medications: str | None = Field(None, max_length=2000)
    notes: str | None = Field(None, max_length=8000)
    provenance: dict[str, Literal["clinician", "voice", "ai", "confirmed"]] = Field(default_factory=dict)


class ReviewIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: Literal["confirm", "edit", "incorrect"]
    edited_findings: list[str] | None = Field(None, max_length=100)
    final_assessment: str | None = Field(None, max_length=4000)
    comment: str | None = Field(None, max_length=2000)


class LoginIn(BaseModel):
    username: str = Field(max_length=64)
    password: str = Field(max_length=256)


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=64, pattern=r"^[A-Za-z0-9_.-]+$")
    password: str = Field(min_length=10, max_length=256)
    role: Literal["paramedic", "admin", "auditor"] = "paramedic"


class ProtocolIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    slug: str = Field(pattern=r"^[a-z0-9-]{3,96}$")
    title: str = Field(max_length=512)
    issuer: str = Field(max_length=256)
    version: str | None = None
    publication_date: str | None = None
    jurisdiction: str = Field(max_length=64)
    source_url: str | None = Field(None, max_length=512)
    language: str = "ru"
    topics: list[str] = Field(default_factory=list)
    sections: list[dict] = Field(default_factory=list)
    status: Literal["current", "superseded", "unverified"] = "unverified"
    notes: str | None = None


class MedicationIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    generic_name: str = Field(max_length=128)
    brand_names: list[str] = Field(default_factory=list)
    drug_class: str | None = None
    fields: dict[str, str] = Field(default_factory=dict)
    source_title: str | None = None
    source_url: str | None = None
    protocol_version: str | None = None
    status: Literal["current", "superseded", "unverified"] = "unverified"
