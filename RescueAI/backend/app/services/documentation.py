"""Documentation assistant. Deterministic: it only re-organises what was entered or
reviewed, with a provenance label on every line. It never writes examination findings."""
from ..models import Encounter

SECTIONS = ["chief_complaint", "history_present_illness", "medical_history", "physical_exam",
            "vital_signs", "ecg_findings", "skin_findings", "wound_findings", "assessment",
            "actions_taken", "patient_response", "disposition_handover"]
SOURCES = {"clinician", "voice", "ai", "confirmed"}
VITAL_LABELS = {"heart_rate": "HR", "sbp": "SBP", "dbp": "DBP", "resp_rate": "RR", "spo2": "SpO2",
                "temp_c": "T °C", "gcs": "GCS", "glucose_mmol": "Glucose mmol/L",
                "consciousness": "ACVPU", "pain_score": "Pain /10"}
TASK_SECTION = {"ecg": "ecg_findings", "skin": "skin_findings", "wound": "wound_findings"}


def _item(text, source):
    return {"text": str(text), "source": source}


def draft(e: Encounter) -> dict:
    prov = e.provenance or {}
    out: dict[str, list] = {s: [] for s in SECTIONS}
    if e.chief_complaint:
        out["chief_complaint"].append(_item(e.chief_complaint, prov.get("chief_complaint", "clinician")))
    if e.onset:
        out["history_present_illness"].append(_item(f"Onset: {e.onset}", prov.get("onset", "clinician")))
    for field in ("history", "allergies", "medications"):
        val = getattr(e, field)
        if val:
            out["medical_history"].append(_item(f"{field.capitalize()}: {val}", prov.get(field, "clinician")))
    vit = e.vitals or {}
    measured = [f"{VITAL_LABELS[k]} {v}" for k, v in vit.items() if v not in (None, "") and k in VITAL_LABELS]
    unmeasured = [VITAL_LABELS[k] for k in VITAL_LABELS if vit.get(k) in (None, "")]
    if measured:
        out["vital_signs"].append(_item(", ".join(measured), prov.get("vitals", "clinician")))
    if unmeasured:
        out["vital_signs"].append(_item("Not recorded: " + ", ".join(unmeasured), "clinician"))

    for a in e.analyses:
        section = TASK_SECTION.get(a.task_type)
        if not section:
            continue
        confirmed = [r for r in a.reviews if r.action in ("confirm", "edit")]
        if confirmed:
            last = confirmed[-1]
            for f in last.edited_findings or []:
                out[section].append(_item(f, "confirmed"))
            if last.final_assessment:
                out[section].append(_item(last.final_assessment, "confirmed"))
        elif a.status == "completed" and a.ai_output:
            out[section].append(_item(f"[AI, not reviewed] {a.ai_output.get('summary', '')}", "ai"))
        elif a.status != "completed":
            out[section].append(_item(f"AI analysis not available ({a.status}).", "clinician"))
    return out


def mark_reviewed(sections: dict) -> dict:
    clean: dict[str, list] = {}
    for name in SECTIONS:
        items = sections.get(name, [])
        if not isinstance(items, list):
            items = []
        clean[name] = []
        for it in items[:100]:
            if not isinstance(it, dict) or not str(it.get("text", "")).strip():
                continue
            src = it.get("source") if it.get("source") in SOURCES else "clinician"
            clean[name].append({"text": str(it["text"])[:4000], "source": src})
    return clean


def to_text(sections: dict) -> str:
    tags = {"clinician": "", "voice": " [voice]", "ai": " [AI]", "confirmed": " [confirmed]"}
    lines = []
    for name in SECTIONS:
        items = sections.get(name) or []
        if not items:
            continue
        lines.append(name.replace("_", " ").upper())
        lines += [f"- {it['text']}{tags.get(it['source'], '')}" for it in items]
        lines.append("")
    return "\n".join(lines).strip()
