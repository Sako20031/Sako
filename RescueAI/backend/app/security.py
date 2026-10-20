"""Authentication, authorization, CSRF, rate limiting and audit helpers."""
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from .config import get_settings
from .db import get_db
from .models import AuditLog, User

COOKIE_NAME = "rescue_session"
CSRF_HEADER = "x-rescue-client"  # custom header: cross-site forms cannot set it
ALGORITHM = "HS256"
ROLES = {"paramedic", "admin", "auditor"}


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=get_settings().bcrypt_rounds)).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def create_token(user: User) -> str:
    s = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user.id,
        "role": user.role,
        "iat": now,
        "exp": now + timedelta(minutes=s.access_token_minutes),
    }
    return jwt.encode(payload, s.secret_key, algorithm=ALGORITHM)


def _decode(token: str) -> dict:
    try:
        return jwt.decode(token, get_settings().secret_key, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "session_invalid")


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "not_authenticated")
    payload = _decode(token)
    user = db.get(User, payload.get("sub"))
    if not user or not user.active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "session_invalid")
    if request.method not in ("GET", "HEAD", "OPTIONS") and request.headers.get(CSRF_HEADER) != "1":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "csrf_header_missing")
    return user


def require_role(*roles: str):
    def dep(user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
        return user

    return dep


class RateLimiter:
    """Sliding-window limiter, in-process. With several server instances use a shared
    store (e.g. Redis); this is documented in docs/SECURITY.md."""

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str, limit: int, window: float = 60.0) -> None:
        now = time.monotonic()
        with self._lock:
            q = self._hits[key]
            while q and now - q[0] > window:
                q.popleft()
            if len(q) >= limit:
                raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "rate_limited")
            q.append(now)

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


limiter = RateLimiter()


def audit(db: Session, user_id: str | None, action: str, object_type: str | None = None,
          object_id: str | None = None, **detail) -> None:
    """Record an audit event. `detail` must hold non-clinical metadata only."""
    db.add(AuditLog(user_id=user_id, action=action, object_type=object_type,
                    object_id=object_id, detail=detail))
