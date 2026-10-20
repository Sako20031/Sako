"""Upload validation, technical image-quality heuristics and analysis-copy preparation.

The uploaded bytes are never modified. Any transformation is applied to a separate
analysis copy and recorded in `transformations`.
"""
import io
from dataclasses import dataclass, field

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError
from pypdf import PdfReader
from pypdf.errors import PdfReadError

from ..config import get_settings

ALLOWED = {"image/jpeg", "image/png", "application/pdf"}

# Long-edge caps for the copy sent to the model. ECG keeps more pixels so grid lines and
# calibration marks survive; skin and wound photos need less.
ANALYSIS_LONG_EDGE = {"ecg": 2400, "skin": 1600, "wound": 1600}
MIN_SHORT_EDGE = {"ecg": 700, "skin": 400, "wound": 400}


class UploadRejected(Exception):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


@dataclass
class PreparedMedia:
    media_type: str
    original: bytes
    analysis_bytes: bytes
    analysis_media_type: str
    width: int | None = None
    height: int | None = None
    pages: int | None = None
    transformations: list[str] = field(default_factory=list)
    quality: dict = field(default_factory=dict)


def sniff(data: bytes) -> str | None:
    """Detect the real type from content, ignoring the client-declared MIME type."""
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"%PDF-"):
        return "application/pdf"
    return None


def validate_and_prepare(data: bytes, task: str) -> PreparedMedia:
    s = get_settings()
    if not data:
        raise UploadRejected("empty_file")
    if len(data) > s.max_upload_mb * 1024 * 1024:
        raise UploadRejected("file_too_large")
    kind = sniff(data)
    if kind not in ALLOWED:
        raise UploadRejected("unsupported_file_type")
    if kind == "application/pdf":
        if task != "ecg":
            raise UploadRejected("pdf_only_for_ecg")
        return _prepare_pdf(data, s.max_pdf_pages)
    return _prepare_image(data, kind, task, s.max_image_pixels)


def _prepare_pdf(data: bytes, max_pages: int) -> PreparedMedia:
    try:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            raise UploadRejected("pdf_encrypted")
        pages = len(reader.pages)
    except (PdfReadError, ValueError, KeyError):
        raise UploadRejected("pdf_corrupt")
    if pages == 0:
        raise UploadRejected("pdf_corrupt")
    if pages > max_pages:
        raise UploadRejected("pdf_too_many_pages")
    return PreparedMedia(
        media_type="application/pdf", original=data, analysis_bytes=data,
        analysis_media_type="application/pdf", pages=pages,
        quality={"assessed": False, "reason": "pdf_not_rasterized", "level": "not_assessed"},
    )


def _prepare_image(data: bytes, kind: str, task: str, max_pixels: int) -> PreparedMedia:
    Image.MAX_IMAGE_PIXELS = max_pixels
    try:
        with Image.open(io.BytesIO(data)) as probe:
            probe.verify()  # structural check; image must be reopened afterwards
        img = Image.open(io.BytesIO(data))
        img.load()
    except (UnidentifiedImageError, OSError, SyntaxError):
        raise UploadRejected("image_corrupt")
    except Image.DecompressionBombError:
        raise UploadRejected("image_too_many_pixels")

    transformations: list[str] = []
    oriented = ImageOps.exif_transpose(img)
    if oriented is not img:
        transformations.append("exif_orientation_applied")
    img = oriented
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
        transformations.append("converted_to_rgb")

    width, height = img.size
    quality = assess_quality(img, task)

    cap = ANALYSIS_LONG_EDGE.get(task, 1600)
    if max(width, height) > cap:
        scale = cap / max(width, height)
        img = img.resize((round(width * scale), round(height * scale)), Image.Resampling.LANCZOS)
        transformations.append(f"downscaled_long_edge_to_{cap}px")

    buf = io.BytesIO()
    if task == "ecg":
        # PNG is lossless: no JPEG artefacts on thin grid lines and waveforms.
        img.save(buf, format="PNG", optimize=True)
        out_type = "image/png"
        transformations.append("encoded_png_lossless")
    else:
        img.convert("RGB").save(buf, format="JPEG", quality=90)
        out_type = "image/jpeg"
        transformations.append("encoded_jpeg_q90")
    transformations.append("metadata_stripped")
    img.close()

    return PreparedMedia(
        media_type=kind, original=data, analysis_bytes=buf.getvalue(),
        analysis_media_type=out_type, width=width, height=height,
        transformations=transformations, quality=quality,
    )


def assess_quality(img: Image.Image, task: str) -> dict:
    """Technical heuristics only: resolution, exposure, contrast, sharpness.

    These detect obviously unusable photos. They do not judge clinical content and a
    passing result does not mean the image is diagnostically adequate.
    """
    gray = img.convert("L")
    gray.thumbnail((1024, 1024))
    a = np.asarray(gray, dtype=np.float32)
    mean = float(a.mean())
    std = float(a.std())
    lap = a[1:-1, 1:-1] * -4 + a[:-2, 1:-1] + a[2:, 1:-1] + a[1:-1, :-2] + a[1:-1, 2:]
    sharpness = float(lap.var())

    issues: list[str] = []
    short_edge = min(img.size)
    if short_edge < MIN_SHORT_EDGE.get(task, 400):
        issues.append("low_resolution")
    if mean < 40:
        issues.append("too_dark")
    elif mean > 235:
        issues.append("overexposed")
    if std < 12:
        issues.append("low_contrast")
    if sharpness < 30:
        issues.append("blurry")

    blocking = {"blurry", "too_dark", "overexposed", "low_contrast"}
    if len(issues) >= 2 and blocking & set(issues):
        level = "poor"
    elif issues:
        level = "limited"
    else:
        level = "acceptable"
    return {
        "assessed": True,
        "level": level,
        "issues": issues,
        "metrics": {"mean_brightness": round(mean, 1), "contrast_std": round(std, 1),
                    "sharpness_laplacian_var": round(sharpness, 1), "short_edge_px": short_edge},
        "method": "heuristic_v1",
    }
