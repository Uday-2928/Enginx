from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Challenge, ChallengeSummary, ChallengeDetail

router = APIRouter(prefix="/api/challenges", tags=["Challenges"])

@router.get("", response_model=List[ChallengeSummary])
def list_challenges(
    discipline: Optional[str] = Query(None, description="Discipline filter: cse, ece-verilog, ece-embedded, ai-ml, cybersecurity, robotics, hardware"),
    difficulty: Optional[str] = Query(None, description="Difficulty filter: Easy, Medium, Hard"),
    q: Optional[str] = Query(None, description="Search query by keyword or topic"),
    db: Session = Depends(get_db)
):
    query = db.query(Challenge)
    if discipline and discipline.lower() != "all":
        query = query.filter(Challenge.discipline == discipline.lower())
    if difficulty and difficulty.lower() != "all":
        query = query.filter(Challenge.difficulty == difficulty.capitalize())
    if q:
        search = f"%{q}%"
        query = query.filter(
            (Challenge.title.ilike(search)) |
            (Challenge.topic.ilike(search)) |
            (Challenge.description.ilike(search))
        )
    return query.order_by(Challenge.order_index, Challenge.title).all()

@router.get("/{challenge_id}", response_model=ChallengeDetail)
def get_challenge(challenge_id: str, db: Session = Depends(get_db)):
    challenge = db.query(Challenge).filter(
        (Challenge.id == challenge_id) | (Challenge.slug == challenge_id)
    ).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return challenge
