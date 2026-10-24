from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Badge, UserBadge, User
from security import get_current_user

router = APIRouter(prefix="/api/badges", tags=["Badges & Gamification"])

@router.get("")
def list_badges(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    badges = db.query(Badge).all()
    earned = db.query(UserBadge.badge_id).filter(UserBadge.user_id == current_user.id).all()
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
