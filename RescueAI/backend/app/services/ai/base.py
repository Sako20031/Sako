"""Provider abstraction. A provider either returns validated findings or an explicit failure
status. There is no code path that turns a failure into a result."""
import base64
import json
from dataclasses import dataclass
from typing import Protocol

from ...schemas.ai import AIFindings

PIPELINE_VERSION = "rescue-ai-pipeline/0.1.0"

UNAVAILABLE_MESSAGE = (
    "AI analysis is currently unavailable. Use the verified medical reference and "
    "applicable emergency protocol."
)


@dataclass
class AIRequest:
    task: str
    language: str
    context: dict
    media_bytes: bytes | None = None
    media_type: str | None = None

    def context_text(self) -> str:
        # Only clinical fields the clinician entered; no patient identifier is sent.
        safe = {k: v for k, v in self.context.items() if k not in {"patient_ref"}}
        return "Clinician-entered context (null = not recorded, unknown):\n" + json.dumps(
            safe, ensure_ascii=False, sort_keys=True
        )

    def media_b64(self) -> str | None:
        return base64.standard_b64encode(self.media_bytes).decode() if self.media_bytes else None


@dataclass
class AIResult:
    # completed | failed | unavailable | refused | invalid_output
    status: str
    findings: AIFindings | None = None
    error_code: str | None = None
    provider: str | None = None
    model: str | None = None


class AIProvider(Protocol):
    name: str

    async def analyze(self, req: AIRequest) -> AIResult: ...

    def health(self) -> dict: ...


class UnavailableProvider:
    name = "none"

    def __init__(self, reason: str = "not_configured") -> None:
        self.reason = reason

    async def analyze(self, req: AIRequest) -> AIResult:
        return AIResult(status="unavailable", error_code=self.reason, provider=self.name)

    def health(self) -> dict:
        return {"provider": self.name, "available": False, "reason": self.reason}
