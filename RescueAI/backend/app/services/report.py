"""Structured clinical report (sections A-G) for one analysis."""
from sqlalchemy.orm import Session

from ..models import Analysis
from . import references
from .ai.base import UNAVAILABLE_MESSAGE

STATUS_MESSAGES = {
    "processing": "Analysis in progress. Urgent guidance above does not depend on it.",
    "unavailable": UNAVAILABLE_MESSAGE,
    "failed": "AI analysis failed. No interpretation is available. This is not a normal result.",
    "refused": "The AI provider declined this request. No interpretation is available.",
    "invalid_output": "The AI output failed validation and was discarded. No interpretation is available.",
    "rejected_quality": "The input could not be interpreted. Retake or re-upload; this is not a normal result.",
}


def build(db: Session, a: Analysis) -> dict:
    safety = (a.input_meta or {}).get("safety") or {}
    presented = safety.get("presented")
    triage = a.triage or {}
    refs = references.for_task(db, a.task_type)

    findings = {"observed": [], "measurements": [], "patient_reported": a.clinical_context, "algorithmic": [],
                "clinician_confirmed": []}
    differential: list[dict] = []
    limitations: list[str] = list(safety.get("fixed_limitations", []))
    next_steps: list[str] = []
    if presented:
        findings["observed"] = presented["observations"]
        findings["measurements"] = presented["measurements"]
        findings["algorithmic"] = [{"summary": presented["summary"],
                                    "dangerous_findings": presented["dangerous_findings"]}]
        differential = presented["interpretations"]
        limitations += presented["limitations"]
        next_steps = presented["recommended_verification"]

    for r in a.reviews:
        if r.action in ("confirm", "edit"):
            findings["clinician_confirmed"].append({
                "action": r.action, "findings": r.edited_findings, "final_assessment": r.final_assessment,
                "at": r.created_at.isoformat()})

    quality = (a.input_meta or {}).get("quality") or {}
    return {
        "analysis_id": a.id,
        "task_type": a.task_type,
        "status": a.status,
        "status_message": STATUS_MESSAGES.get(a.status),
        "error_code": a.error_code,
        "A_immediate_danger": {
            "rules_level": triage.get("level"),
            "final_urgency": safety.get("final_urgency", triage.get("level")),
            "alerts": triage.get("alerts", []),
            "ai_dangerous_findings": presented["dangerous_findings"] if presented else [],
            "missing_vitals": triage.get("missing_vitals", []),
            "limited_by_missing_information": bool(triage.get("missing_vitals")),
            "conflict_requires_attention": safety.get("conflict_requires_attention", False),
        },
        "B_findings": findings,
        "C_differential": differential,
        "D_next_steps": next_steps,
        "E_limitations": limitations,
        "F_references": refs,
        "G_review": {
            "required": True,
            "history": [{"action": r.action, "final_assessment": r.final_assessment, "comment": r.comment,
                         "edited_findings": r.edited_findings, "at": r.created_at.isoformat(),
                         "reviewer_id": r.reviewer_id} for r in a.reviews],
            "original_ai_output_preserved": a.ai_output is not None,
        },
        "technical": {
            "quality": quality,
            "transformations": (a.input_meta or {}).get("transformations", []),
            "safety_flags": safety.get("safety_flags", []),
            "provider": a.provider, "model": a.model, "pipeline_version": a.pipeline_version,
            "rules_version": triage.get("rules_version"), "rules_status": triage.get("rules_status"),
        },
    }
