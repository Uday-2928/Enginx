from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User, UserProgress, UserBadge
from security import get_current_user

router = APIRouter(prefix="/api/leaderboard", tags=["Leaderboard"])

@router.get("")
def get_leaderboard(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    users = db.query(User).order_by(User.xp.desc()).limit(limit).all()
    results = []
    for rank, u in enumerate(users, start=1):
        completed = db.query(UserProgress).filter(
            UserProgress.user_id == u.id,
            UserProgress.completed == True
        ).count()
        badges_count = db.query(UserBadge).filter(UserBadge.user_id == u.id).count()

        results.append({
            "rank": rank,
            "id": u.id,
            "name": u.name,
            "role": u.primary_role,
            "avatar_url": u.avatar_url,
            "xp": u.xp,
            "streak_days": u.streak_days,
            "completed_challenges": completed,
            "badges_count": badges_count
        })
    return results
