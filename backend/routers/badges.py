from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional, List
from database import get_db
from models import Badge, UserBadge, User

router = APIRouter(prefix="/api/badges", tags=["Badges & Gamification"])

@router.get("")
def list_badges(email: Optional[str] = "student@enginx.dev", db: Session = Depends(get_db)):
    badges = db.query(Badge).all()
    user = db.query(User).filter(User.email == email).first()

    earned_set = set()
    if user:
        earned = db.query(UserBadge.badge_id).filter(UserBadge.user_id == user.id).all()
        earned_set = {b[0] for b in earned}

    result = []
    for b in badges:
        result.append({
            "id": b.id,
            "name": b.name,
            "description": b.description,
            "icon": b.icon,
            "discipline": b.discipline,
            "xp_bonus": b.xp_bonus,
            "earned": b.id in earned_set
        })
    return result
