"""Private file storage for originals the clinician chose to save.

Local filesystem by default (outside any public web root, files 0600). For production,
replace with private object storage behind the same two functions.
"""
import os
import uuid
from pathlib import Path

from ..config import get_settings


def _root() -> Path:
    root = Path(get_settings().storage_dir).resolve()
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    return root


def save_original(data: bytes) -> str:
    name = uuid.uuid4().hex
    path = _root() / name
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "wb") as f:
        f.write(data)
    return name


def read(name: str) -> bytes:
    path = (_root() / name).resolve()
    if path.parent != _root():
        raise FileNotFoundError(name)
    return path.read_bytes()


def delete(name: str | None) -> None:
    if not name:
        return
    path = (_root() / name).resolve()
    if path.parent == _root() and path.exists():
        path.unlink()
