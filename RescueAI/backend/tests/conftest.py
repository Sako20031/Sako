import io
import os
import shutil
import tempfile

_tmp = tempfile.mkdtemp(prefix="rescue-test-")
os.environ.update({
    "RESCUE_ENVIRONMENT": "test",
    "RESCUE_DATABASE_URL": f"sqlite:///{_tmp}/test.db",
    "RESCUE_STORAGE_DIR": f"{_tmp}/storage",
    "RESCUE_AI_PROVIDER": "none",
    "RESCUE_BCRYPT_ROUNDS": "4",
    "RESCUE_RATE_LIMIT_ANALYSES_PER_MINUTE": "1000",
})

import numpy as np  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from PIL import Image, ImageFilter  # noqa: E402

from app.config import get_settings  # noqa: E402
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import User  # noqa: E402
from app.security import hash_password, limiter  # noqa: E402
from app.services.ai import registry  # noqa: E402

PASSWORD = "correct-horse-battery"


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    db = SessionLocal()
    for name, role in (("medic", "paramedic"), ("medic2", "paramedic"), ("boss", "admin"), ("aud", "auditor")):
        db.add(User(username=name, password_hash=hash_password(PASSWORD), role=role))
    db.commit()
    db.close()
    limiter.reset()
    registry.set_provider(None)
    s = get_settings()
    s.ai_external_images_authorized = False
    yield
    registry.set_provider(None)


def make_client(username: str | None = "medic") -> TestClient:
    c = TestClient(app)
    c.headers["x-rescue-client"] = "1"
    if username:
        r = c.post("/api/auth/login", json={"username": username, "password": PASSWORD})
        assert r.status_code == 200, r.text
    return c


@pytest.fixture
def client():
    return make_client("medic")


@pytest.fixture
def admin():
    return make_client("boss")


def ecg_like_png(w=1600, h=1000) -> bytes:
    """Synthetic grid + zig-zag waveform: sharp, high-contrast test image (not a real ECG)."""
    a = np.full((h, w), 245, np.uint8)
    a[:, ::20] = 200
    a[::20, :] = 200
    x = np.arange(w)
    y = (h // 2 + 120 * np.sin(x / 15) * (x % 160 < 20)).astype(int)
    for dx in range(3):
        a[np.clip(y + dx, 0, h - 1), x] = 0
    buf = io.BytesIO()
    Image.fromarray(a).convert("RGB").save(buf, "PNG")
    return buf.getvalue()


def blurry_jpeg(w=1200, h=900) -> bytes:
    img = Image.open(io.BytesIO(ecg_like_png(w, h))).filter(ImageFilter.GaussianBlur(25))
    img = img.point(lambda v: 120 + (v - 120) // 8)
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=85)
    return buf.getvalue()


def photo_jpeg(w=1200, h=900) -> bytes:
    rng = np.random.default_rng(0)
    a = rng.integers(60, 200, (h, w, 3), dtype=np.uint8)
    buf = io.BytesIO()
    Image.fromarray(a).save(buf, "JPEG", quality=90)
    return buf.getvalue()


def tiny_pdf(pages=1) -> bytes:
    from pypdf import PdfWriter
    w = PdfWriter()
    for _ in range(pages):
        w.add_blank_page(width=600, height=400)
    buf = io.BytesIO()
    w.write(buf)
    return buf.getvalue()


def pytest_sessionfinish(session, exitstatus):
    shutil.rmtree(_tmp, ignore_errors=True)
