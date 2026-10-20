"""Claude provider against a mock HTTP transport (no network, no real key)."""
import asyncio
import json

import anthropic
import httpx2

from app.services.ai.anthropic_provider import AnthropicProvider
from app.services.ai.base import AIRequest

from .fakes import findings


def make(handler, retries=0):
    client = anthropic.DefaultAsyncHttpxClient(transport=httpx2.MockTransport(handler))
    return AnthropicProvider("sk-test-not-real", "claude-opus-5-5", 5, retries, "high", http_client=client)


def message(text, stop="end_turn"):
    return {"id": "msg_1", "type": "message", "role": "assistant", "model": "claude-opus-5-5",
            "content": [{"type": "text", "text": text}], "stop_reason": stop, "stop_sequence": None,
            "usage": {"input_tokens": 10, "output_tokens": 10}}


REQ = AIRequest(task="ecg", language="kk", context={"patient_ref": "PAT-1", "flags": []},
                media_bytes=b"\x89PNG\r\n\x1a\nfake", media_type="image/png")


def run(p, req=REQ):
    return asyncio.run(p.analyze(req))


def test_success_request_shape_and_validation():
    seen = {}

    def handler(request):
        seen["body"] = json.loads(request.content)
        seen["headers"] = request.headers
        return httpx2.Response(200, json=message(findings().model_dump_json()))

    res = run(make(handler))
    assert res.status == "completed" and res.findings.summary == "Synthetic test summary."
    body = seen["body"]
    assert body["model"] == "claude-opus-5-5"
    assert body["fallbacks"] == "default"
    assert "server-side-fallback-2026-07-01" in seen["headers"]["anthropic-beta"]
    assert body["output_config"]["format"]["type"] == "json_schema"
    assert body["thinking"] == {"type": "adaptive"}
    blocks = body["messages"][0]["content"]
    assert blocks[0]["type"] == "image" and blocks[0]["source"]["media_type"] == "image/png"
    assert "PAT-1" not in json.dumps(body)
    assert "Kazakh" in body["system"]


def test_pdf_sent_as_document_block():
    seen = {}

    def handler(request):
        seen["body"] = json.loads(request.content)
        return httpx2.Response(200, json=message(findings().model_dump_json()))

    run(make(handler), AIRequest(task="ecg", language="ru", context={}, media_bytes=b"%PDF-1.4",
                                 media_type="application/pdf"))
    assert seen["body"]["messages"][0]["content"][0]["type"] == "document"


def test_refusal_is_not_a_result():
    res = run(make(lambda r: httpx2.Response(200, json=message("", stop="refusal"))))
    assert res.status == "refused" and res.findings is None


def test_truncated_and_malformed_outputs_are_invalid():
    assert run(make(lambda r: httpx2.Response(200, json=message("{", stop="max_tokens")))).status == "invalid_output"
    assert run(make(lambda r: httpx2.Response(200, json=message("not json")))).status == "invalid_output"
    bad = json.dumps({"summary": "missing fields"})
    assert run(make(lambda r: httpx2.Response(200, json=message(bad)))).error_code == "schema_validation_failed"


def test_http_errors_map_to_failed():
    err = {"type": "error", "error": {"type": "x", "message": "x"}}
    for code, expected in ((401, "provider_auth_failed"), (429, "provider_rate_limited"),
                           (500, "provider_http_500"), (400, "provider_bad_request")):
        res = run(make(lambda r, c=code: httpx2.Response(c, json=err)))
        assert res.status == "failed" and res.error_code == expected


def test_connection_error_maps_to_unreachable():
    def handler(request):
        raise httpx2.ConnectError("down")

    assert run(make(handler)).error_code == "provider_unreachable"


def test_bounded_retries():
    calls = {"n": 0}

    def handler(request):
        calls["n"] += 1
        return httpx2.Response(500, json={"type": "error", "error": {"type": "api_error", "message": "x"}})

    run(make(handler, retries=2))
    assert calls["n"] == 3
