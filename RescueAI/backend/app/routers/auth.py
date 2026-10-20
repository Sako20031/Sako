from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..models import User
from ..schemas.api import LoginIn
from ..security import COOKIE_NAME, audit, create_token, current_user, limiter, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
def login(body: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    s = get_settings()
    limiter.check(f"login:{request.client.host if request.client else 'x'}", s.rate_limit_login_per_minute)
    user = db.scalar(select(User).where(User.username == body.username))
    if not user or not user.active or not verify_password(body.password, user.password_hash):
        audit(db, None, "login_failed")
        db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid_credentials")
    response.set_cookie(COOKIE_NAME, create_token(user), httponly=True, secure=s.cookie_secure,
                        samesite="strict", max_age=s.access_token_minutes * 60, path="/")
    audit(db, user.id, "login")
    db.commit()
    return {"id": user.id, "username": user.username, "role": user.role}


@router.post("/logout")
def logout(response: Response, user: User = Depends(current_user), db: Session = Depends(get_db)):
    response.delete_cookie(COOKIE_NAME, path="/")
    audit(db, user.id, "logout")
    db.commit()
    return {"ok": True}


@router.get("/me")
def me(user: User = Depends(current_user)):
    return {"id": user.id, "username": user.username, "role": user.role}
