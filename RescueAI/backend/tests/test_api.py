import json
import os
from datetime import datetime, timedelta, timezone

import pytest

from app.db import SessionLocal
from app.models import Analysis, AuditLog
from app.routers.admin import purge_expired
from app.services.ai import registry

from .conftest import PASSWORD, ecg_like_png, make_client, photo_jpeg, tiny_pdf
from .fakes import FakeProvider, findings, ok


def upload(client, task="ecg", data=None, name="e.png", mime="image/png", **form):
    return client.post("/api/analyses", data={"task_type": task, "context": "{}", **form},
                       files={"file": (name, data if data is not None else ecg_like_png(), mime)})


# --- authentication & authorization -------------------------------------------------

def test_login_sets_httponly_strict_cookie():
    c = make_client(None)
    r = c.post("/api/auth/login", json={"username": "medic", "password": PASSWORD})
    cookie = r.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=strict" in cookie
    assert c.get("/api/auth/me").json()["username"] == "medic"


def test_wrong_password_and_unauthenticated():
    c = make_client(None)
    assert c.post("/api/auth/login", json={"username": "medic", "password": "nope"}).status_code == 401
    assert c.get("/api/encounters").status_code == 401


def test_login_rate_limit():
    c = make_client(None)
    codes = [c.post("/api/auth/login", json={"username": "medic", "password": "x"}).status_code for _ in range(12)]
    assert 429 in codes


def test_csrf_header_required_for_mutations(client):
    del client.headers["x-rescue-client"]
    assert client.post("/api/encounters", json={}).status_code == 403


def test_paramedic_cannot_use_admin_endpoints(client):
    assert client.post("/api/admin/retention/run").status_code == 403
    assert client.get("/api/admin/audit").status_code == 403


def test_other_paramedic_cannot_see_encounter(client):
    eid = client.post("/api/encounters", json={"chief_complaint": "x"}).json()["id"]
    other = make_client("medic2")
    assert other.get(f"/api/encounters/{eid}").status_code == 404
    assert other.delete(f"/api/encounters/{eid}").status_code == 404


def test_auditor_reads_audit_log_without_clinical_content(client):
    client.post("/api/encounters", json={"chief_complaint": "SECRET-COMPLAINT-123", "patient_ref": "PAT-999"})
    rows = make_client("aud").get("/api/admin/audit").json()
    assert any(r["action"] == "encounter_create" for r in rows)
    assert "SECRET-COMPLAINT-123" not in json.dumps(rows) and "PAT-999" not in json.dumps(rows)


# --- encounters & documentation -----------------------------------------------------

def test_encounter_partial_data_unknown_stays_null(client):
    r = client.post("/api/encounters", json={"chief_complaint": "chest pain"})
    assert r.status_code == 201
    e = r.json()
    assert e["vitals"]["spo2"] is None and e["age_years"] is None and e["sex"] == "unknown"


def test_documentation_requires_review_before_export_and_keeps_provenance(client):
    eid = client.post("/api/encounters", json={"chief_complaint": "palpitations", "vitals": {"heart_rate": 150},
                                               "provenance": {"chief_complaint": "voice"}}).json()["id"]
    note = client.post(f"/api/encounters/{eid}/documentation").json()
    assert note["sections"]["chief_complaint"][0]["source"] == "voice"
    assert note["sections"]["physical_exam"] == []  # never invented
    assert any("Not recorded" in i["text"] for i in note["sections"]["vital_signs"])
    url = f"/api/encounters/{eid}/documentation/{note['id']}"
    assert client.get(url + "/export").status_code == 409
    reviewed = client.post(url + "/review", json={"sections": note["sections"]}).json()
    assert reviewed["status"] == "reviewed"
    assert "[voice]" in client.get(url + "/export").json()["text"]


def test_delete_encounter_removes_analyses_and_files(client):
    eid = client.post("/api/encounters", json={}).json()["id"]
    aid = upload(client, encounter_id=eid, save_original="true").json()["id"]
    db = SessionLocal()
    path = db.get(Analysis, aid).original_path
    db.close()
    from app.config import get_settings
    full = os.path.join(get_settings().storage_dir, path)
    assert os.path.exists(full)
    assert client.delete(f"/api/encounters/{eid}").json()["analyses_deleted"] == 1
    assert not os.path.exists(full)
    assert client.get(f"/api/analyses/{aid}").status_code == 404


# --- uploads --------------------------------------------------------------------------

@pytest.mark.parametrize("data,code", [
    (b"", "empty_file"),
    (b"GIF89a....", "unsupported_file_type"),
    (b"<html><script>alert(1)</script>", "unsupported_file_type"),
    (b"\xff\xd8\xff\xe0garbage-not-a-jpeg", "image_corrupt"),
    (b"%PDF-1.4 broken", "pdf_corrupt"),
])
def test_invalid_files_rejected(client, data, code):
    r = upload(client, data=data)
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == code


def test_declared_mime_is_ignored_in_favour_of_content(client):
    r = upload(client, data=b"MZ\x90\x00 executable", name="ecg.png", mime="image/png")
    assert r.json()["detail"]["code"] == "unsupported_file_type"


def test_pdf_only_for_ecg_and_page_limit(client):
    assert upload(client, "skin", tiny_pdf(), "a.pdf", "application/pdf").json()["detail"]["code"] == "pdf_only_for_ecg"
    assert upload(client, "ecg", tiny_pdf(9), "a.pdf", "application/pdf").json()["detail"]["code"] == "pdf_too_many_pages"
    r = upload(client, "ecg", tiny_pdf(1), "a.pdf", "application/pdf")
    assert r.status_code == 202 and r.json()["quality"]["level"] == "not_assessed"


def test_too_large_file_rejected(client):
    from app.config import get_settings
    big = b"\xff\xd8\xff" + b"0" * (get_settings().max_upload_mb * 1024 * 1024 + 10)
    assert upload(client, data=big).status_code in (413, 422)


def test_decompression_bomb_rejected(client):
    from app.config import get_settings
    s = get_settings()
    old = s.max_image_pixels
    s.max_image_pixels = 100_000
    try:
        r = upload(client, data=ecg_like_png(1600, 1000))
        assert r.json()["detail"]["code"] == "image_too_many_pixels"
    finally:
        s.max_image_pixels = old


def test_original_preserved_and_transformations_recorded(client):
    registry.set_provider(FakeProvider(ok()))
    from app.config import get_settings
    get_settings().ai_external_images_authorized = True
    original = ecg_like_png(3200, 2000)
    aid = upload(client, data=original, save_original="true").json()["id"]
    assert client.get(f"/api/analyses/{aid}/original").content == original
    rep = client.get(f"/api/analyses/{aid}").json()
    assert "downscaled_long_edge_to_2400px" in rep["technical"]["transformations"]
    assert "encoded_png_lossless" in rep["technical"]["transformations"]


def test_original_not_stored_unless_requested(client):
    aid = upload(client).json()["id"]
    assert client.get(f"/api/analyses/{aid}/original").status_code == 404


def test_idempotency_key_returns_same_analysis(client):
    a = client.post("/api/analyses", data={"task_type": "ecg", "context": "{}"},
                    files={"file": ("e.png", ecg_like_png(), "image/png")}, headers={"Idempotency-Key": "k-1"})
    b = client.post("/api/analyses", data={"task_type": "ecg", "context": "{}"},
                    files={"file": ("e.png", ecg_like_png(), "image/png")}, headers={"Idempotency-Key": "k-1"})
    assert a.json()["id"] == b.json()["id"] and b.status_code == 200


def test_analysis_rate_limit(client):
    from app.config import get_settings
    s = get_settings()
    old = s.rate_limit_analyses_per_minute
    s.rate_limit_analyses_per_minute = 2
    try:
        codes = [upload(client).status_code for _ in range(3)]
        assert codes[-1] == 429
    finally:
        s.rate_limit_analyses_per_minute = old


# --- review -----------------------------------------------------------------------------

def test_review_preserves_original_ai_output(client):
    registry.set_provider(FakeProvider(ok(findings(summary="ORIGINAL"))))
    from app.config import get_settings
    get_settings().ai_external_images_authorized = True
    aid = upload(client).json()["id"]
    client.post(f"/api/analyses/{aid}/review", json={"action": "edit", "edited_findings": ["AF"], "final_assessment": "AF"})
    rep = client.post(f"/api/analyses/{aid}/review", json={"action": "incorrect", "comment": "wrong lead"}).json()
    assert [h["action"] for h in rep["G_review"]["history"]] == ["edit", "incorrect"]
    db = SessionLocal()
    assert db.get(Analysis, aid).ai_output["summary"] == "ORIGINAL"
    db.close()


# --- references -----------------------------------------------------------------------

def test_seed_search_and_bundle_etag(client):
    from app.services import references
    db = SessionLocal()
    assert references.seed(db) >= 5
    assert references.seed(db) == 0  # idempotent
    db.close()
    res = client.get("/api/references/protocols", params={"q": "ESC"}).json()
    assert res["total"] == 1 and res["items"][0]["status"] == "unverified"
    assert res["kz_verified_count"] == 0
    b = client.get("/api/references/bundle")
    etag = b.headers["etag"]
    assert client.get("/api/references/bundle", headers={"If-None-Match": etag}).status_code == 304


def test_protocol_versioning_and_verification_rules(admin):
    body = {"slug": "kz-test", "title": "T", "issuer": "MoH RK", "jurisdiction": "KZ", "status": "current"}
    assert admin.put("/api/admin/protocols/kz-test", json=body).status_code == 422  # current needs a source
    body |= {"source_url": "https://example.org/doc", "status": "unverified"}
    p1 = admin.put("/api/admin/protocols/kz-test", json=body).json()
    p2 = admin.put("/api/admin/protocols/kz-test", json=body | {"status": "current"}).json()
    assert p1["revision"] == 1 and p2["revision"] == 2 and p2["last_verified"] and p2["verified_by"] == "boss"
    db = SessionLocal()
    from app.models import ProtocolDocument
    pid = db.query(ProtocolDocument).filter_by(slug="kz-test").one().id
    db.close()
    revs = admin.get(f"/api/admin/revisions/{pid}").json()
    assert [r["revision"] for r in revs] == [1, 2]


def test_medication_dose_requires_source_and_missing_fields_are_null(admin, client):
    bad = {"generic_name": "testdrug", "fields": {"dosing": "10 mg"}}
    assert admin.put("/api/admin/medications/testdrug", json=bad).status_code == 422
    admin.put("/api/admin/medications/testdrug", json={"generic_name": "testdrug", "drug_class": "test"})
    m = client.get("/api/references/medications", params={"q": "testdrug"}).json()["items"][0]
    assert m["fields"]["dosing"] is None and m["fields"]["pediatric"] is None
    assert m["dosing_verified"] is False


def test_retention_purges_old_analyses_and_files(client):
    aid = upload(client, save_original="true").json()["id"]
    db = SessionLocal()
    a = db.get(Analysis, aid)
    a.created_at = datetime.now(timezone.utc) - timedelta(days=400)
    db.commit()
    assert purge_expired(db) == 1
    db.commit()
    assert db.get(Analysis, aid) is None
    db.close()


def test_stale_processing_job_reported_failed(client):
    from app.models import Analysis as A
    db = SessionLocal()
    from app.models import User
    uid = db.query(User).filter_by(username="medic").one().id
    a = A(owner_id=uid, task_type="ecg", status="processing", pipeline_version="t",
          created_at=datetime.now(timezone.utc) - timedelta(hours=2))
    db.add(a)
    db.commit()
    aid = a.id
    db.close()
    assert client.get(f"/api/analyses/{aid}").json()["status"] == "failed"


def test_status_reports_real_availability():
    c = make_client(None)
    s = c.get("/api/status").json()
    assert s["ai"]["available"] is False and s["ai"]["image_analysis_available"] is False


def test_errors_do_not_echo_clinical_values(client):
    r = client.post("/api/encounters", json={"chief_complaint": "x" * 3000})
    assert r.status_code == 422 and "xxxx" not in r.text


def test_audit_entries_written(client):
    upload(client)
    db = SessionLocal()
    actions = {a.action for a in db.query(AuditLog).all()}
    db.close()
    assert {"login", "analysis_create"} <= actions


def test_separate_original_is_preserved_when_copy_is_edited(client):
    original = photo_jpeg(1600, 1200)
    edited = photo_jpeg(800, 600)
    r = client.post("/api/analyses", data={"task_type": "skin", "context": "{}", "save_original": "true"},
                    files={"file": ("copy.jpg", edited, "image/jpeg"), "original": ("orig.jpg", original, "image/jpeg")})
    assert r.status_code == 202
    assert client.get(f"/api/analyses/{r.json()['id']}/original").content == original
    bad = client.post("/api/analyses", data={"task_type": "skin", "context": "{}", "save_original": "true"},
                      files={"file": ("copy.jpg", edited, "image/jpeg"), "original": ("o.txt", b"hello", "text/plain")})
    assert bad.json()["detail"]["code"] == "original_invalid"


def test_production_refuses_insecure_configuration():
    from pydantic import ValidationError

    from app.config import Settings
    with pytest.raises(ValidationError):
        Settings(environment="production")
    with pytest.raises(ValidationError):
        Settings(environment="production", secret_key="x" * 40, cookie_secure=False)
    assert Settings(environment="production", secret_key="x" * 40, cookie_secure=True).cookie_secure
