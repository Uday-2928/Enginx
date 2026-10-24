from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
from database import get_db
from models import User, UserProgress, Challenge
from security import get_current_user

router = APIRouter(prefix="/api/user", tags=["User Progress & Skill Tree"])

@router.get("/progress")
def get_user_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    progress_entries = db.query(UserProgress).filter(UserProgress.user_id == current_user.id).all()
    progress_map = {}
    completed_ids = []

    for p in progress_entries:
        progress_map[p.challenge_id] = {
            "completed": p.completed,
            "attempts": p.attempts_count,
            "best_time_ms": p.best_execution_time_ms,
            "xp_awarded": p.xp_awarded
        }
        if p.completed:
            completed_ids.append(p.challenge_id)

    return {
        "completed_challenges": completed_ids,
        "progress_map": progress_map
    }

@router.get("/stats")
def get_user_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total_challenges = db.query(Challenge).count()
    completed_count = db.query(UserProgress).filter(
        UserProgress.user_id == current_user.id,
        UserProgress.completed == True
    ).count()

    # Calculate discipline breakdown
    disciplines = ["cse", "ece-verilog", "ece-embedded", "ai-ml", "cybersecurity", "robotics", "hardware"]
    breakdown = {}
    for d in disciplines:
        d_total = db.query(Challenge).filter(Challenge.discipline == d).count()
        d_done = db.query(UserProgress).join(Challenge).filter(
            UserProgress.user_id == current_user.id,
            UserProgress.completed == True,
            Challenge.discipline == d
        ).count()
        breakdown[d] = {
            "completed": d_done,
            "total": d_total,
            "percentage": round((d_done / d_total * 100) if d_total > 0 else 0, 1)
        }

    return {
        "user_id": current_user.id,
        "name": current_user.name,
        "role": current_user.primary_role,
        "xp": current_user.xp,
        "streak_days": current_user.streak_days,
        "completed_count": completed_count,
        "total_challenges": total_challenges,
        "discipline_breakdown": breakdown
    }

@router.get("/skill-tree")
def get_skill_tree(
    discipline: Optional[str] = "all",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns visual skill-tree nodes for graph rendering in the dashboard.
    Nodes have statuses: 'completed' (glow green), 'in_progress' (pulse blue), 'locked' (charcoal).
    """
    completed = db.query(UserProgress.challenge_id).filter(
        UserProgress.user_id == current_user.id,
        UserProgress.completed == True
    ).all()
    completed_ids = {c[0] for c in completed}

    query = db.query(Challenge)
    if discipline and discipline.lower() != "all":
        query = query.filter(Challenge.discipline == discipline.lower())

    challenges = query.order_by(Challenge.discipline, Challenge.order_index).all()

    nodes = []
    links = []

    # Build sequence links within each discipline
    by_disc: Dict[str, List[Challenge]] = {}
    for ch in challenges:
        by_disc.setdefault(ch.discipline, []).append(ch)

    for disc, ch_list in by_disc.items():
        prev_node_id = None
        for i, ch in enumerate(ch_list):
            is_done = ch.id in completed_ids
            # Node is unlocked if first in track or previous was completed
            is_unlocked = (i == 0) or (prev_node_id in completed_ids)

            status = "completed" if is_done else ("in_progress" if is_unlocked else "locked")

            node = {
                "id": ch.id,
                "title": ch.title,
                "discipline": ch.discipline,
                "topic": ch.topic,
                "difficulty": ch.difficulty,
                "xp": ch.xp_reward,
                "status": status,
                "order": ch.order_index,
                "x": (i * 120) + 60,
                "y": 100
            }
            nodes.append(node)

            if prev_node_id:
                links.append({
                    "source": prev_node_id,
                    "target": ch.id,
                    "active": is_done
                })
            prev_node_id = ch.id

    return {
        "nodes": nodes,
        "links": links
    }
