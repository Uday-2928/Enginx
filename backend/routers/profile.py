from fastapi import APIRouter, Depends, Path
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models import (
    LessonCompletion,
    CompletedLessonsResponse,
    LessonCompletionResponse,
    ProfileUpdate,
    User,
    UserResponse,
)
from security import get_current_user

router = APIRouter(prefix="/api/user", tags=["User Profile & Learning Progress"])


@router.get("/profile", response_model=UserResponse)
def read_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/profile", response_model=UserResponse)
@router.patch("/profile", response_model=UserResponse)
def update_profile(
    changes: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for field, value in changes.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/lessons/completed", response_model=CompletedLessonsResponse)
def list_completed_lessons(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the current user's durable lesson completion ids.

    The POST completion endpoint is intentionally idempotent.  This read endpoint
    is the smallest companion needed for a frontend refresh to restore saved
    lesson state without inventing client-side persistence.
    """

    completions = db.query(LessonCompletion.lesson_id).filter(
        LessonCompletion.user_id == current_user.id,
    ).order_by(LessonCompletion.completed_at.asc()).all()
    return {"lesson_ids": [lesson_id for (lesson_id,) in completions]}


@router.post(
    "/lessons/{lesson_id}/complete",
    response_model=LessonCompletionResponse,
)
def complete_lesson(
    lesson_id: str = Path(..., min_length=1, max_length=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(LessonCompletion).filter(
        LessonCompletion.user_id == current_user.id,
        LessonCompletion.lesson_id == lesson_id,
    ).first()
    if existing:
        return LessonCompletionResponse(
            lesson_id=existing.lesson_id,
            completed=True,
            completed_at=existing.completed_at,
            already_completed=True,
        )

    completion = LessonCompletion(user_id=current_user.id, lesson_id=lesson_id)
    db.add(completion)
    try:
        db.commit()
    except IntegrityError:
        # Two tabs can complete the same lesson at once.  The unique constraint
        # makes the operation idempotent; return the winner's record instead of
        # surfacing a duplicate-key error.
        db.rollback()
        existing = db.query(LessonCompletion).filter(
            LessonCompletion.user_id == current_user.id,
            LessonCompletion.lesson_id == lesson_id,
        ).first()
        if existing:
            return LessonCompletionResponse(
                lesson_id=existing.lesson_id,
                completed=True,
                completed_at=existing.completed_at,
                already_completed=True,
            )
        raise

    db.refresh(completion)
    return LessonCompletionResponse(
        lesson_id=completion.lesson_id,
        completed=True,
        completed_at=completion.completed_at,
        already_completed=False,
    )
