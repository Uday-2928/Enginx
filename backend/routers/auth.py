from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models import ProfileUpdate, User, UserCreate, UserResponse
from security import create_access_token, get_current_user, hash_password, verify_password


router = APIRouter(prefix="/api/auth", tags=["Authentication & Onboarding"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class OnboardingRequest(BaseModel):
    role: str  # 'CSE', 'ECE', 'AI', 'CYBER', 'ROBOTICS', 'HARDWARE'
    name: Optional[str] = None
    # Accepted only for compatibility with the old client.  It is deliberately
    # ignored; the bearer token is the only source of user identity.
    email: Optional[EmailStr] = None
    branch: Optional[str] = Field(default=None, max_length=100)
    specialization: Optional[str] = Field(default=None, max_length=100)
    degree: Optional[str] = Field(default=None, max_length=100)
    year: Optional[int] = Field(default=None, ge=1, le=10)
    goal: Optional[str] = Field(default=None, max_length=255)
    weekly_hours: Optional[int] = Field(default=None, ge=0, le=168)

    class Config:
        extra = "forbid"


def _normalise_email(email: str) -> str:
    return str(email).strip().lower()


@router.post("/signup", response_model=TokenResponse)
def signup(req: UserCreate, db: Session = Depends(get_db)):
    """Create a user with a required bcrypt password."""

    email = _normalise_email(req.email)
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

    new_user = User(
        email=email,
        name=req.name,
        hashed_password=hash_password(req.password),
        primary_role=req.primary_role or "CSE",
        branch=req.branch,
        specialization=req.specialization,
        degree=req.degree,
        year=req.year,
        goal=req.goal,
        weekly_hours=req.weekly_hours,
        ece_preferences=req.ece_preferences.model_dump() if req.ece_preferences else None,
        avatar_url=req.avatar_url or f"https://api.dicebear.com/7.x/bottts/svg?seed={req.name}",
        xp=0,
        streak_days=1,
    )
    db.add(new_user)
    try:
        db.commit()
    except IntegrityError:
        # The pre-check gives a useful response in the common case while this
        # handles two concurrent signups for the same address safely.
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")
    db.refresh(new_user)
    return {
        "access_token": create_access_token(new_user),
        "token_type": "bearer",
        "user": new_user,
    }


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Verify credentials and issue a signed bearer token."""

    user = db.query(User).filter(User.email == _normalise_email(req.email)).first()
    # ``hashed_password`` is nullable for rows from the old demo schema.  Such
    # rows must fail closed rather than being auto-created or authenticated.
    if user is None or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {
        "access_token": create_access_token(user),
        "token_type": "bearer",
        "user": user,
    }


@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
@router.patch("/me", response_model=UserResponse)
def update_current_user(
    changes: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Backwards-compatible profile update on the authenticated user."""

    for field, value in changes.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/onboarding")
def complete_onboarding(
    req: OnboardingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Complete onboarding as an authenticated profile update.

    ``req.email`` is accepted only as a deprecated compatibility field and is
    never read for authorization or persistence.
    """

    current_user.primary_role = req.role
    if req.name:
        current_user.name = req.name
    for field in ("branch", "specialization", "degree", "year", "goal", "weekly_hours"):
        value = getattr(req, field)
        if value is not None:
            setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return {
        "success": True,
        "message": f"Welcome to EnginX {req.role} Track!",
        "user": current_user,
    }
