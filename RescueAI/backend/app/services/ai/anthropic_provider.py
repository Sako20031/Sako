"""Claude (Anthropic Messages API) provider for image and text decision support.

The API key stays on the server. Output is constrained to the AIFindings JSON schema and
validated again with Pydantic; anything that does not validate is reported as
`invalid_output`, never shown as a result.
"""
import json
import logging

import anthropic
from pydantic import ValidationError

from ...schemas.ai import AIFindings, strict_json_schema
from .base import AIRequest, AIResult
from .prompts import system_prompt

log = logging.getLogger("rescue.ai")

# Server-side fallback: if a safety classifier declines a request, the API re-runs it on
# Anthropic's recommended fallback model inside the same call.
FALLBACK_BETA = "server-side-fallback-2026-07-01"


class AnthropicProvider:
    name = "anthropic"

    def __init__(self, api_key: str, model: str, timeout: float, max_retries: int,
                 effort: str, http_client=None) -> None:
        kwargs = {"api_key": api_key, "timeout": timeout, "max_retries": max_retries}
        if http_client is not None:
            kwargs["http_client"] = http_client
        self.client = anthropic.AsyncAnthropic(**kwargs)
        self.model = model
        self.effort = effort
        self._schema = strict_json_schema(AIFindings)

    def health(self) -> dict:
        return {"provider": self.name, "available": True, "model": self.model}

    def _content(self, req: AIRequest) -> list[dict]:
        blocks: list[dict] = []
        if req.media_bytes:
            source = {"type": "base64", "media_type": req.media_type, "data": req.media_b64()}
            kind = "document" if req.media_type == "application/pdf" else "image"
            blocks.append({"type": kind, "source": source})
        blocks.append({"type": "text", "text": req.context_text()})
        return blocks

    async def analyze(self, req: AIRequest) -> AIResult:
        base = {"provider": self.name, "model": self.model}
        try:
            response = await self.client.beta.messages.create(
                model=self.model,
                max_tokens=16000,
                betas=[FALLBACK_BETA],
                fallbacks="default",
                thinking={"type": "adaptive"},
                output_config={
                    "effort": self.effort,
                    "format": {"type": "json_schema", "schema": self._schema},
                },
                system=system_prompt(req.task, req.language),
                messages=[{"role": "user", "content": self._content(req)}],
            )
        except anthropic.APITimeoutError:
            return AIResult(status="failed", error_code="provider_timeout", **base)
        except anthropic.AuthenticationError:
            return AIResult(status="failed", error_code="provider_auth_failed", **base)
        except anthropic.RateLimitError:
            return AIResult(status="failed", error_code="provider_rate_limited", **base)
        except anthropic.BadRequestError as e:
            log.warning("provider rejected request: %s", e.status_code)
            return AIResult(status="failed", error_code="provider_bad_request", **base)
        except anthropic.APIStatusError as e:
            return AIResult(status="failed", error_code=f"provider_http_{e.status_code}", **base)
        except anthropic.APIConnectionError:
            return AIResult(status="failed", error_code="provider_unreachable", **base)

        served_model = getattr(response, "model", None) or self.model
        if response.stop_reason == "refusal":
            return AIResult(status="refused", error_code="provider_refused",
                            provider=self.name, model=served_model)
        if response.stop_reason == "max_tokens":
            return AIResult(status="invalid_output", error_code="output_truncated",
                            provider=self.name, model=served_model)

        text = next((b.text for b in response.content if b.type == "text"), None)
        if not text:
            return AIResult(status="invalid_output", error_code="no_text_output",
                            provider=self.name, model=served_model)
        try:
            findings = AIFindings.model_validate(json.loads(text))
        except (json.JSONDecodeError, ValidationError):
            return AIResult(status="invalid_output", error_code="schema_validation_failed",
                            provider=self.name, model=served_model)
        return AIResult(status="completed", findings=findings,
                        provider=self.name, model=served_model)
