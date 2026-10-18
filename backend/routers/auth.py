from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import User, UserResponse, UserCreate

router = APIRouter(prefix="/api/auth", tags=["Authentication & Onboarding"])

class LoginRequest(BaseModel):
    email: str
    password: Optional[str] = "enginx123"

class OnboardingRequest(BaseModel):
    role: str # 'CSE', 'ECE', 'AI', 'CYBER', 'ROBOTICS', 'HARDWARE'
    name: Optional[str] = None
    email: Optional[str] = None

@router.post("/signup", response_model=UserResponse)
def signup(req: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        return existing

    new_user = User(
        email=req.email,
        name=req.name,
        primary_role=req.primary_role or "CSE",
        avatar_url=req.avatar_url or f"https://api.dicebear.com/7.x/bottts/svg?seed={req.name}",
        xp=0,
        streak_days=1
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=UserResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        # Auto-create demo user if not found for seamless trial
        name = req.email.split("@")[0].capitalize()
        user = User(
            email=req.email,
            name=name,
            primary_role="CSE",
            avatar_url=f"https://api.dicebear.com/7.x/bottts/svg?seed={name}",
            xp=100,
            streak_days=3
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

@router.get("/me", response_model=UserResponse)
def get_current_user(email: Optional[str] = "student@enginx.dev", db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = db.query(User).first()
    if not user:
        user = User(
            email="student@enginx.dev",
            name="Alex Rivera",
            primary_role="ECE",
            avatar_url="https://api.dicebear.com/7.x/bottts/svg?seed=Alex",
            xp=250,
            streak_days=5
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

@router.post("/onboarding")
def complete_onboarding(req: OnboardingRequest, db: Session = Depends(get_db)):
    email = req.email or "student@enginx.dev"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            name=req.name or "Engineer",
            primary_role=req.role,
            avatar_url=f"https://api.dicebear.com/7.x/bottts/svg?seed={req.role}",
            xp=50,
            streak_days=1
        )
        db.add(user)
    else:
        user.primary_role = req.role
        if req.name:
            user.name = req.name

    db.commit()
    db.refresh(user)
    return {
        "success": True,
        "message": f"Welcome to EnginX {req.role} Track!",
        "user": user
    }
