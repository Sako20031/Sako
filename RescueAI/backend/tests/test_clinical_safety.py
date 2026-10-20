"""Dangerous clinical failure modes. Passing these does not establish clinical safety;
it shows that specific known-bad behaviours are prevented in software."""
import json

from app.services.ai import registry
from app.services.ai.base import UNAVAILABLE_MESSAGE, AIResult
from app.services.references import NO_PROTOCOL_MESSAGE

from .conftest import blurry_jpeg, ecg_like_png, photo_jpeg
from .fakes import FakeProvider, findings, ok


def post_image(client, task, data, ctx=None, name="x.jpg", mime="image/jpeg", **form):
    return client.post("/api/analyses", data={"task_type": task, "context": json.dumps(ctx or {}), **form},
                       files={"file": (name, data, mime)})


def authorize_images():
    from app.config import get_settings
    get_settings().ai_external_images_authorized = True


def test_failed_analysis_on_blurry_ecg_is_not_reported_as_normal(client):
    registry.set_provider(FakeProvider(AIResult(status="failed", error_code="provider_timeout", provider="fake")))
    authorize_images()
    r = post_image(client, "ecg", blurry_jpeg())
    assert r.status_code == 202
    assert r.json()["quality"]["level"] in ("poor", "limited")
    rep = client.get(f"/api/analyses/{r.json()['id']}").json()
    assert rep["status"] == "failed"
    assert rep["C_differential"] == []
    assert "not a normal result" in rep["status_message"]
    assert rep["B_findings"]["observed"] == []


def test_uninterpretable_input_suppresses_interpretations_and_values(client):
    f = findings(input_assessment={"technical_quality": "uninterpretable", "quality_issues": ["blur"]})
    registry.set_provider(FakeProvider(ok(f)))
    authorize_images()
    rep = client.get(f"/api/analyses/{post_image(client, 'ecg', blurry_jpeg()).json()['id']}").json()
    assert rep["status"] == "rejected_quality"
    assert rep["C_differential"] == []
    assert all(m["value"] is None for m in rep["B_findings"]["measurements"])


def test_missing_vitals_are_unknown_not_normal(client):
    r = client.post("/api/triage", json={"task": "symptoms", "context": {"vitals": {"heart_rate": 80}}})
    t = r.json()
    assert t["level"] == "indeterminate"
    assert set(t["missing_vitals"]) == {"resp_rate", "spo2", "sbp", "consciousness"}


def test_airway_emergency_does_not_wait_for_image_analysis(client):
    class Exploding(FakeProvider):
        async def analyze(self, req):
            raise AssertionError("must not matter")

    registry.set_provider(Exploding())
    authorize_images()
    ctx = {"flags": ["throat_tongue_swelling", "severe_breathing_difficulty"]}
    r = post_image(client, "skin", photo_jpeg(), ctx)
    assert r.status_code == 202
    assert r.json()["triage"]["level"] == "critical"
    assert r.json()["triage"]["immediate_action_required"] is True
    # Even a rejected upload returns the critical triage.
    bad = post_image(client, "skin", b"not an image", ctx)
    assert bad.status_code == 422
    assert bad.json()["detail"]["triage"]["level"] == "critical"
    # Provider crash ends as failed, not success.
    assert client.get(f"/api/analyses/{r.json()['id']}").json()["status"] == "failed"


def test_normal_looking_rash_cannot_override_severe_symptoms(client):
    f = findings(input_assessment={"input_kind": "skin_photo"}, urgency={"level": "non_urgent", "indicators": []})
    registry.set_provider(FakeProvider(ok(f)))
    authorize_images()
    ctx = {"flags": ["wheeze_stridor", "dizziness_hypotension_signs"]}
    rep = client.get(f"/api/analyses/{post_image(client, 'skin', photo_jpeg(), ctx).json()['id']}").json()
    assert rep["status"] == "completed"
    assert rep["A_immediate_danger"]["final_urgency"] == "critical"
    assert rep["A_immediate_danger"]["conflict_requires_attention"] is True
    assert "conflict_ai_lower_than_reported_signs" in rep["technical"]["safety_flags"]
    assert "rash_absence_does_not_exclude_anaphylaxis" in rep["E_limitations"]


def test_wound_photo_cannot_exclude_deep_injury(client):
    f = findings(input_assessment={"input_kind": "wound_photo"}, summary="Appears superficial abrasion")
    registry.set_provider(FakeProvider(ok(f)))
    authorize_images()
    ctx = {"flags": ["distal_numbness_weakness"]}
    rep = client.get(f"/api/analyses/{post_image(client, 'wound', photo_jpeg(), ctx).json()['id']}").json()
    assert "photo_cannot_establish_depth_or_deep_injury" in rep["E_limitations"]
    assert rep["A_immediate_danger"]["final_urgency"] == "urgent"


def test_every_failed_ai_status_produces_no_interpretation(client):
    authorize_images()
    for status in ("failed", "refused", "invalid_output", "unavailable"):
        registry.set_provider(FakeProvider(AIResult(status=status, error_code="x", provider="fake")))
        rep = client.get(f"/api/analyses/{post_image(client, 'ecg', ecg_like_png(), name='e.png', mime='image/png').json()['id']}").json()
        assert rep["status"] == status
        assert rep["C_differential"] == [] and rep["D_next_steps"] == []


def test_completed_status_without_findings_is_not_success(client):
    registry.set_provider(FakeProvider(AIResult(status="completed", findings=None, provider="fake")))
    authorize_images()
    rep = client.get(f"/api/analyses/{post_image(client, 'ecg', ecg_like_png(), mime='image/png').json()['id']}").json()
    assert rep["status"] == "invalid_output"


def test_no_provider_shows_exact_unavailable_message(client):
    rep = client.get(f"/api/analyses/{post_image(client, 'ecg', ecg_like_png(), mime='image/png').json()['id']}").json()
    assert rep["status"] == "unavailable"
    assert rep["status_message"] == UNAVAILABLE_MESSAGE
    assert client.get("/api/status").json()["ai"]["unavailable_message"] == UNAVAILABLE_MESSAGE


def test_images_not_sent_externally_without_authorization(client):
    fake = FakeProvider(ok())
    registry.set_provider(fake)
    rep = client.get(f"/api/analyses/{post_image(client, 'skin', photo_jpeg()).json()['id']}").json()
    assert rep["status"] == "unavailable"
    assert rep["error_code"] == "external_images_not_authorized"
    assert fake.requests == []


def test_missing_protocol_never_produces_invented_citation(client):
    registry.set_provider(FakeProvider(ok()))
    authorize_images()
    rep = client.get(f"/api/analyses/{post_image(client, 'ecg', ecg_like_png(), mime='image/png').json()['id']}").json()
    refs = rep["F_references"]
    assert refs["kz_protocol_available"] is False
    assert refs["message"] == NO_PROTOCOL_MESSAGE
    assert refs["verified_kz"] == [] and refs["verified_other"] == []


def test_measurement_value_without_assessment_is_suppressed(client):
    f = findings(measurements=[{"name": "QTc", "value": 520, "unit": "ms", "method": "guess",
                                "availability": "not_assessable", "limitations": "T wave end unclear"}])
    registry.set_provider(FakeProvider(ok(f)))
    authorize_images()
    rep = client.get(f"/api/analyses/{post_image(client, 'ecg', ecg_like_png(), mime='image/png').json()['id']}").json()
    assert rep["B_findings"]["measurements"][0]["value"] is None
    assert "suppressed_value_without_assessment" in rep["technical"]["safety_flags"]


def test_ai_higher_urgency_than_reported_signs_is_flagged_for_review(client):
    f = findings(urgency={"level": "critical", "indicators": ["wide complex tachycardia pattern"]})
    registry.set_provider(FakeProvider(ok(f)))
    authorize_images()
    rep = client.get(f"/api/analyses/{post_image(client, 'ecg', ecg_like_png(), mime='image/png').json()['id']}").json()
    assert rep["A_immediate_danger"]["final_urgency"] == "critical"
    assert "ai_flags_urgency_not_in_reported_signs" in rep["technical"]["safety_flags"]


def test_ecg_report_always_carries_ecg_specific_limitations(client):
    registry.set_provider(FakeProvider(ok()))
    authorize_images()
    rep = client.get(f"/api/analyses/{post_image(client, 'ecg', ecg_like_png(), mime='image/png').json()['id']}").json()
    for lim in ("ecg_cannot_determine_pulse", "normal_ecg_does_not_exclude_acs", "ecg_image_measurements_are_estimates"):
        assert lim in rep["E_limitations"]


def test_patient_identifier_is_not_sent_to_provider(client):
    fake = FakeProvider(ok())
    registry.set_provider(fake)
    r = client.post("/api/analyses/symptoms", json={"chief_complaint": "chest pain", "flags": ["chest_pain_ongoing"]})
    assert r.status_code == 202
    assert "patient_ref" not in fake.requests[0].context_text()
    assert r.json()["triage"]["level"] == "urgent"


def test_vital_threshold_triggers_and_impossible_values_rejected(client):
    t = client.post("/api/triage", json={"context": {"vitals": {"spo2": 85, "sbp": 80, "resp_rate": 16,
                                                               "heart_rate": 100, "consciousness": "A"}}}).json()
    codes = {a["code"] for a in t["alerts"]}
    assert {"spo2_low", "sbp_low"} <= codes and t["level"] == "critical"
    assert client.post("/api/triage", json={"context": {"vitals": {"spo2": 150}}}).status_code == 422


def test_unknown_flag_codes_are_ignored_not_guessed(client):
    t = client.post("/api/triage", json={"context": {"flags": ["made_up_flag"]}}).json()
    assert t["alerts"] == [] and t["level"] == "indeterminate"
