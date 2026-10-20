"""Post-processing safety rules applied to every AI output before it is shown.

The raw validated output is stored unchanged; these rules produce the *presented* view
plus explicit safety flags, so the clinician can see what was suppressed and why.
"""
from ..schemas.ai import AIFindings
from .triage import max_urgency

ORDER = {"indeterminate": 0, "non_urgent": 1, "urgent": 2, "critical": 3}


def apply(task: str, findings: AIFindings, triage: dict, quality: dict) -> dict:
    view = findings.model_dump()
    flags: list[str] = []

    # 1. Unusable input: no interpretation is presented, and it can never read as "normal".
    model_quality = findings.input_assessment.technical_quality
    if model_quality == "uninterpretable":
        view["interpretations"] = []
        view["measurements"] = [
            {**m, "value": None, "availability": "not_assessable"} for m in view["measurements"]
        ]
        flags.append("input_uninterpretable")
    elif model_quality == "poor" or quality.get("level") == "poor":
        flags.append("quality_limited_cannot_exclude")

    # 2. A measurement marked not assessable must not carry a value.
    for m in view["measurements"]:
        if m["availability"] == "not_assessable" and m["value"] is not None:
            m["value"] = None
            flags.append("suppressed_value_without_assessment")

    # 3. The AI can raise urgency but never lower what the clinician reported.
    ai_level = findings.urgency.level
    rules_level = triage.get("level", "indeterminate")
    final = max_urgency(ai_level, rules_level)
    if ORDER.get(rules_level, 0) >= ORDER["urgent"] and ORDER.get(ai_level, 0) < ORDER[rules_level]:
        flags.append("conflict_ai_lower_than_reported_signs")
    if ORDER.get(ai_level, 0) >= ORDER["urgent"] and ORDER.get(rules_level, 0) < ORDER[ai_level]:
        flags.append("ai_flags_urgency_not_in_reported_signs")

    # 4. Fixed, task-specific limitations that are always shown.
    fixed = {
        "ecg": ["ecg_image_measurements_are_estimates", "ecg_cannot_determine_pulse",
                "normal_ecg_does_not_exclude_acs"],
        "skin": ["photo_does_not_establish_diagnosis", "rash_absence_does_not_exclude_anaphylaxis"],
        "wound": ["photo_cannot_establish_depth_or_deep_injury"],
        "symptoms": ["checklist_does_not_replace_examination"],
    }[task]

    requires_review = any(f.startswith("conflict") for f in flags) or "input_uninterpretable" in flags
    return {
        "presented": view,
        "final_urgency": final,
        "safety_flags": flags,
        "fixed_limitations": fixed,
        "requires_clinician_review": True,
        "conflict_requires_attention": requires_review,
    }
