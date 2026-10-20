"""Common structured output for every AI task.

This model is also the JSON schema the provider is constrained to. It deliberately has
no probability / confidence field: the providers we integrate do not return calibrated
clinical probabilities, so none is requested or displayed.
"""
from typing import Literal

from pydantic import BaseModel, ConfigDict

TaskType = Literal["ecg", "skin", "wound", "symptoms"]
Quality = Literal["good", "adequate", "poor", "uninterpretable", "not_applicable"]
Urgency = Literal["critical", "urgent", "non_urgent", "indeterminate"]


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class InputAssessment(_Strict):
    input_kind: str  # e.g. 12_lead, rhythm_strip, monitor_screenshot, skin_photo, wound_photo, text_only, unknown
    technical_quality: Quality
    quality_issues: list[str]


class Observation(_Strict):
    text: str
    location: str | None


class Measurement(_Strict):
    name: str
    value: float | None
    unit: str
    method: str
    availability: Literal["estimated", "not_assessable"]
    limitations: str


class Interpretation(_Strict):
    name: str
    supporting_evidence: list[str]
    evidence_against: list[str]
    missing_information: list[str]
    is_dangerous_alternative: bool


class UrgencyAssessment(_Strict):
    level: Urgency
    indicators: list[str]


class AIFindings(_Strict):
    input_assessment: InputAssessment
    summary: str
    observations: list[Observation]
    measurements: list[Measurement]
    interpretations: list[Interpretation]
    urgency: UrgencyAssessment
    dangerous_findings: list[str]
    missing_information: list[str]
    recommended_verification: list[str]
    limitations: list[str]


def strict_json_schema(model: type[BaseModel]) -> dict:
    """Pydantic schema -> structured-output schema: every object closed, every key required."""
    schema = model.model_json_schema()

    def walk(node):
        if isinstance(node, dict):
            if node.get("type") == "object" and "properties" in node:
                node["additionalProperties"] = False
                node["required"] = list(node["properties"].keys())
            node.pop("title", None)
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)

    walk(schema)
    return schema
