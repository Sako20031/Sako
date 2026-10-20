"""Test doubles. Synthetic data only."""
from app.schemas.ai import AIFindings
from app.services.ai.base import AIRequest, AIResult


def findings(**over) -> AIFindings:
    base = {
        "input_assessment": {"input_kind": "12_lead", "technical_quality": "good", "quality_issues": []},
        "summary": "Synthetic test summary.",
        "observations": [{"text": "Regular narrow complexes", "location": None}],
        "measurements": [{"name": "heart_rate", "value": 72, "unit": "bpm", "method": "RR interval count",
                          "availability": "estimated", "limitations": "image-derived"}],
        "interpretations": [{"name": "Sinus rhythm", "supporting_evidence": ["P before each QRS"],
                             "evidence_against": [], "missing_information": [], "is_dangerous_alternative": False}],
        "urgency": {"level": "non_urgent", "indicators": []},
        "dangerous_findings": [],
        "missing_information": [],
        "recommended_verification": ["Repeat 12-lead ECG"],
        "limitations": [],
    }
    for k, v in over.items():
        if isinstance(v, dict) and isinstance(base.get(k), dict):
            base[k] = {**base[k], **v}
        else:
            base[k] = v
    return AIFindings.model_validate(base)


class FakeProvider:
    name = "fake"

    def __init__(self, result: AIResult | None = None, exc: Exception | None = None):
        self.result = result
        self.exc = exc
        self.requests: list[AIRequest] = []

    async def analyze(self, req: AIRequest) -> AIResult:
        self.requests.append(req)
        if self.exc:
            raise self.exc
        return self.result

    def health(self):
        return {"provider": self.name, "available": True, "model": "fake-1"}


def ok(f: AIFindings | None = None) -> AIResult:
    return AIResult(status="completed", findings=f or findings(), provider="fake", model="fake-1")
