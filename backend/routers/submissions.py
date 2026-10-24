import httpx
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from config import settings
from models import (
    Submission, SubmissionCreate, SubmissionHistoryItem, SubmissionHistoryResponse, SubmissionResponse,
    Challenge, User, UserProgress, Badge, UserBadge
)
from security import get_current_user

router = APIRouter(prefix="/api/submissions", tags=["Submissions & Evaluation"])


def _unavailable_evaluation(message: str = "Evaluation service unavailable; retry your submission."):
    """Return a neutral result for an evaluator outage.

    An outage is not a code verdict.  In particular, it must never look like an
    accepted submission because accepted submissions award progress and XP.
    """

    return {
        "verdict": "UNAVAILABLE",
        "total_time_ms": 0.0,
        "memory_used_kb": 0.0,
        "output": message,
        "test_results": [],
    }


def _history_item(submission: Submission) -> SubmissionHistoryItem:
    """Expose an attempt without returning its source code."""

    unavailable = submission.verdict in {"UNAVAILABLE", "RETRY"}
    return SubmissionHistoryItem(
        id=submission.id,
        challenge_id=submission.challenge_id,
        language=submission.language,
        verdict=submission.verdict,
        execution_time_ms=float(submission.execution_time_ms or 0.0),
        memory_used_kb=float(submission.memory_used_kb or 0.0),
        output=submission.output,
        test_results=submission.test_results or [],
        status="unavailable" if unavailable else "evaluated",
        retryable=unavailable,
        created_at=submission.created_at,
    )


@router.get("/history", response_model=SubmissionHistoryResponse)
def get_submission_history(
    challenge_id: Optional[str] = Query(default=None, max_length=100),
    limit: int = Query(default=20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return recent attempts for the current learner, newest first.

    History is deliberately scoped by the bearer-authenticated user and does
    not expose submitted source code.  A challenge filter keeps the editor
    panel small while still allowing a future learner-history view to request
    all attempts.
    """

    query = db.query(Submission).filter(Submission.user_id == current_user.id)
    if challenge_id:
        query = query.filter(Submission.challenge_id == challenge_id)

    submissions = query.order_by(
        Submission.created_at.desc(),
        Submission.id.desc(),
    ).limit(limit).all()

    return {"items": [_history_item(submission) for submission in submissions]}

@router.post("", response_model=SubmissionResponse)
async def submit_solution(
    req: SubmissionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Fetch challenge
    challenge = db.query(Challenge).filter(Challenge.id == req.challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    # 2. The bearer token is the only source of submission ownership.  Legacy
    # query parameters such as ``user_email`` are intentionally ignored.
    user = current_user

    # 3. Call Evaluation Microservice
    eval_payload = {
        "code": req.code,
        "language": req.language or challenge.language,
        "test_cases": challenge.test_cases,
        "time_limit_ms": challenge.time_limit_ms,
        "memory_limit_mb": challenge.memory_limit_mb
    }

    eval_result = None
    evaluation_status = "evaluated"
    retryable = False
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(settings.EVALUATION_SERVICE_URL, json=eval_payload)
            if resp.status_code == 200:
                eval_result = resp.json()
            elif resp.status_code >= 500 or resp.status_code in (408, 429):
                eval_result = _unavailable_evaluation(
                    f"Evaluation service returned HTTP {resp.status_code}; retry your submission."
                )
                evaluation_status = "unavailable"
                retryable = True
            else:
                eval_result = {
                    "verdict": "RE",
                    "total_time_ms": 0.0,
                    "memory_used_kb": 0.0,
                    "output": f"Evaluator returned {resp.status_code}: {resp.text}",
                    "test_results": []
                }
    except Exception:
        # A missing evaluator is an infrastructure state, not a passing result.
        # Keep the exception detail out of the API response because it can contain
        # internal URLs or connection information.
        eval_result = _unavailable_evaluation()
        evaluation_status = "unavailable"
        retryable = True

    verdict = eval_result.get("verdict", "WA")
    duration = eval_result.get("total_time_ms", 0.0)
    memory = eval_result.get("memory_used_kb", 0.0)
    output = eval_result.get("output", "")
    test_results = eval_result.get("test_results", [])

    if verdict in {"UNAVAILABLE", "RETRY"}:
        evaluation_status = "unavailable"
        retryable = True

    # 4. Save Submission
    sub = Submission(
        id=str(uuid.uuid4()),
        user_id=user.id,
        challenge_id=challenge.id,
        code=req.code,
        language=req.language,
        verdict=verdict,
        execution_time_ms=duration,
        memory_used_kb=memory,
        output=output,
        test_results=test_results
    )
    db.add(sub)

    if verdict in {"UNAVAILABLE", "RETRY"}:
        # Do not create progress, award XP, or unlock badges for an unevaluated
        # submission.  Persisting the attempt keeps the result auditable and lets
        # callers retry without losing the submission record.
        db.commit()
        db.refresh(sub)
        return SubmissionResponse(
            id=sub.id,
            challenge_id=sub.challenge_id,
            language=sub.language,
            verdict=sub.verdict,
            execution_time_ms=sub.execution_time_ms,
            memory_used_kb=sub.memory_used_kb,
            output=sub.output,
            test_results=sub.test_results or [],
            xp_awarded=0,
            new_badges=[],
            status=evaluation_status,
            retryable=retryable,
            created_at=sub.created_at,
        )

    # 5. Handle Progress & XP
    xp_earned = 0
    new_badges = []

    progress = db.query(UserProgress).filter(
        UserProgress.user_id == user.id,
        UserProgress.challenge_id == challenge.id
    ).first()

    if not progress:
        progress = UserProgress(
            user_id=user.id,
            challenge_id=challenge.id,
            completed=(verdict == "AC"),
            attempts_count=1,
            best_execution_time_ms=duration if verdict == "AC" else None,
            xp_awarded=challenge.xp_reward if verdict == "AC" else 0,
            first_completed_at=datetime.utcnow() if verdict == "AC" else None
        )
        db.add(progress)
        if verdict == "AC":
            xp_earned = challenge.xp_reward
            user.xp += xp_earned
    else:
        progress.attempts_count += 1
        if verdict == "AC" and not progress.completed:
            progress.completed = True
            progress.first_completed_at = datetime.utcnow()
            xp_earned = challenge.xp_reward
            progress.xp_awarded = xp_earned
            user.xp += xp_earned
            if progress.best_execution_time_ms is None or duration < progress.best_execution_time_ms:
                progress.best_execution_time_ms = duration

    # 6. Check for badge unlock conditions
    if verdict == "AC":
        # Check First Submission Badge
        first_badge = db.query(Badge).filter(Badge.id == "badge-first-blood").first()
        if first_badge:
            existing_ub = db.query(UserBadge).filter(
                UserBadge.user_id == user.id,
                UserBadge.badge_id == first_badge.id
            ).first()
            if not existing_ub:
                ub = UserBadge(user_id=user.id, badge_id=first_badge.id)
                db.add(ub)
                user.xp += first_badge.xp_bonus
                new_badges.append(first_badge.name)

        # Check Discipline specific badge
        disc_badge = db.query(Badge).filter(Badge.discipline == challenge.discipline).first()
        if disc_badge:
            existing_disc = db.query(UserBadge).filter(
                UserBadge.user_id == user.id,
                UserBadge.badge_id == disc_badge.id
            ).first()
            if not existing_disc:
                ub = UserBadge(user_id=user.id, badge_id=disc_badge.id)
                db.add(ub)
                user.xp += disc_badge.xp_bonus
                new_badges.append(disc_badge.name)

    db.commit()
    db.refresh(sub)

    return SubmissionResponse(
        id=sub.id,
        challenge_id=sub.challenge_id,
        language=sub.language,
        verdict=sub.verdict,
        execution_time_ms=sub.execution_time_ms,
        memory_used_kb=sub.memory_used_kb,
        output=sub.output,
        test_results=sub.test_results or [],
        xp_awarded=xp_earned,
        new_badges=new_badges,
        status=evaluation_status,
        retryable=retryable,
        created_at=sub.created_at
    )
