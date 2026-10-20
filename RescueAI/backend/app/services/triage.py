"""Deterministic danger-sign engine.

Runs on clinician-entered data only, before and independently of any image or AI
analysis, so urgent guidance is never delayed by an upload or a model call. The same
rule file is evaluated in the browser for offline use (frontend/src/lib/triage.ts).
"""
import json
import operator
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

_OPS = {"<=": operator.le, ">=": operator.ge, "<": operator.lt, ">": operator.gt}
_ORDER = {"none": 0, "indeterminate": 0, "non_urgent": 1, "urgent": 2, "critical": 3}


def _rules_path() -> Path:
    env = os.environ.get("RESCUE_SHARED_DIR")
    base = Path(env) if env else Path(__file__).resolve().parents[3] / "shared"
    return base / "triage_rules.json"


@lru_cache
def load_rules() -> dict[str, Any]:
    return json.loads(_rules_path().read_text(encoding="utf-8"))


def _num(v: Any) -> float | None:
    if v is None or v == "":
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def evaluate(task: str, vitals: dict | None, flags: list[str] | None) -> dict:
    rules = load_rules()
    vitals = vitals or {}
    alerts: list[dict] = []

    for code in flags or []:
        rule = rules["flags"].get(code)
        if not rule:
            continue  # unknown codes are ignored, never guessed
        if "*" in rule["tasks"] or task in rule["tasks"]:
            alerts.append({"code": code, "severity": rule["severity"], "kind": "reported_sign"})

    for t in rules["vital_thresholds"]:
        val = _num(vitals.get(t["vital"]))
        if val is not None and _OPS[t["op"]](val, t["value"]):
            alerts.append({"code": t["code"], "severity": t["severity"], "kind": "vital_sign",
                           "vital": t["vital"], "value": val, "source": t["source"]})

    c = rules["consciousness"]
    avpu = vitals.get("consciousness")
    if avpu in c["critical_values"]:
        alerts.append({"code": c["code"], "severity": "critical", "kind": "vital_sign",
                       "vital": "consciousness", "value": avpu, "source": c["source"]})

    # Unmeasured vitals stay unknown. They are listed, never treated as normal.
    missing = [v for v in rules["essential_vitals"] if vitals.get(v) in (None, "")]

    level = "none"
    for a in alerts:
        if _ORDER[a["severity"]] > _ORDER[level]:
            level = a["severity"]
    if level == "none":
        level = "indeterminate"  # absence of alerts is not reassurance

    return {
        "level": level,
        "alerts": alerts,
        "missing_vitals": missing,
        "rules_version": rules["version"],
        "rules_status": rules["status"],
        "immediate_action_required": level == "critical",
    }


def max_urgency(*levels: str) -> str:
    best = "indeterminate"
    for lv in levels:
        if lv and _ORDER.get(lv, 0) > _ORDER[best]:
            best = lv
    return best
