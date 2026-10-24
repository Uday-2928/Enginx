"""Authentication and password helpers for the EnginX API."""

from datetime import datetime, timedelta, timezone
import hashlib
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models import User


if settings.ENVIRONMENT.lower() == "production" and settings.JWT_SECRET == "super-secret-enginx-key-change-me":
    raise RuntimeError("JWT_SECRET must be set to a strong value in production.")


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def _password_bytes(password: str) -> bytes:
    """Pre-hash UTF-8 passwords before bcrypt's 72-byte input limit."""

    return hashlib.sha256(password.encode("utf-8")).digest()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_password_bytes(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed_password: Optional[str]) -> bool:
    if not hashed_password:
        return False
    try:
        return bcrypt.checkpw(_password_bytes(password), hashed_password.encode("utf-8"))
    except (ValueError, TypeError):
        # A malformed legacy hash must behave like an invalid password, not
        # become an internal error or an authentication bypass.
        return False


def create_access_token(user: User) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user.id,
        "email": user.email,
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not token:
        raise _unauthorized()

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        subject = payload.get("sub")
        if not isinstance(subject, str) or not subject:
            raise _unauthorized()
    except (JWTError, ValueError):
        raise _unauthorized()

    user = db.query(User).filter(User.id == subject).first()
    if not user:
        raise _unauthorized()
    return user
