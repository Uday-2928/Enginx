"""Authenticated CRUD for persisted Virtual Hardware Lab projects."""

import json
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from database import get_db
from models import (
    User,
    VirtualHardwareProject,
    VirtualHardwareProjectCreate,
    VirtualHardwareProjectListResponse,
    VirtualHardwareProjectResponse,
    VirtualHardwareProjectSummary,
    VirtualHardwareProjectUpdate,
    VIRTUAL_HARDWARE_MAX_PAYLOAD_BYTES,
)
from security import get_current_user


router = APIRouter(prefix="/api/virtual-hardware/projects", tags=["Virtual Hardware Lab"])


def _payload_from_request(request: VirtualHardwareProjectCreate | VirtualHardwareProjectUpdate, existing: dict | None = None) -> dict:
    payload = dict(existing or {})
    values = request.model_dump(exclude_unset=True)
    for key in ("graph", "code", "guided_step", "completed_steps", "simulation_config"):
        if key in values:
            payload[key] = values[key]
    encoded = json.dumps(payload, ensure_ascii=False, allow_nan=False, separators=(",", ":"))
    if len(encoded.encode("utf-8")) > VIRTUAL_HARDWARE_MAX_PAYLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Project payload exceeds the 512 KiB limit.")
    return payload


def _ensure_board_matches_payload(board_profile: str | None, payload: dict) -> None:
    graph = payload.get("graph")
    graph_board = graph.get("boardId") if isinstance(graph, dict) else None
    if board_profile and graph_board and board_profile != graph_board:
        raise HTTPException(status_code=422, detail="board_profile must match graph.boardId.")


def _summary(project: VirtualHardwareProject) -> VirtualHardwareProjectSummary:
    return VirtualHardwareProjectSummary(
        id=project.id,
        title=project.title,
        description=project.description or "",
        board_profile=project.board_profile,
        project_version=project.project_version,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


def _response(project: VirtualHardwareProject) -> VirtualHardwareProjectResponse:
    payload = project.payload or {}
    return VirtualHardwareProjectResponse(
        **_summary(project).model_dump(),
        graph=payload.get("graph", {}),
        code=payload.get("code", ""),
        guided_step=payload.get("guided_step", "build"),
        completed_steps=payload.get("completed_steps", []),
        simulation_config=payload.get("simulation_config", {}),
    )


def _owned_project(project_id: str, current_user: User, db: Session) -> VirtualHardwareProject:
    project = db.query(VirtualHardwareProject).filter(
        VirtualHardwareProject.id == project_id,
        VirtualHardwareProject.owner_id == current_user.id,
    ).first()
    if not project:
        # Do not reveal whether another user owns this id.
        raise HTTPException(status_code=404, detail="Virtual hardware project not found.")
    return project


@router.post("", response_model=VirtualHardwareProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    request: VirtualHardwareProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payload = _payload_from_request(request)
    _ensure_board_matches_payload(request.board_profile, payload)
    now = datetime.utcnow()
    project = VirtualHardwareProject(
        id=str(uuid.uuid4()),
        owner_id=current_user.id,
        title=request.title,
        description=request.description,
        board_profile=request.board_profile,
        project_version=request.project_version,
        payload=payload,
        created_at=now,
        updated_at=now,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return _response(project)


@router.get("", response_model=VirtualHardwareProjectListResponse)
def list_projects(
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    projects = db.query(VirtualHardwareProject).filter(
        VirtualHardwareProject.owner_id == current_user.id,
    ).order_by(
        VirtualHardwareProject.updated_at.desc(),
        VirtualHardwareProject.id.desc(),
    ).limit(limit).all()
    return {"items": [_summary(project) for project in projects]}


@router.get("/{project_id}", response_model=VirtualHardwareProjectResponse)
def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _response(_owned_project(project_id, current_user, db))


@router.patch("/{project_id}", response_model=VirtualHardwareProjectResponse)
def update_project(
    project_id: str,
    request: VirtualHardwareProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _owned_project(project_id, current_user, db)
    values = request.model_dump(exclude_unset=True)
    payload = _payload_from_request(request, project.payload or {})
    board_profile = values.get("board_profile", project.board_profile)
    _ensure_board_matches_payload(board_profile, payload)

    for field in ("title", "description", "project_version"):
        if field in values:
            setattr(project, field, values[field])
    project.board_profile = board_profile
    project.payload = payload
    project.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(project)
    return _response(project)


@router.post("/{project_id}/duplicate", response_model=VirtualHardwareProjectResponse, status_code=status.HTTP_201_CREATED)
def duplicate_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    source = _owned_project(project_id, current_user, db)
    now = datetime.utcnow()
    duplicate = VirtualHardwareProject(
        id=str(uuid.uuid4()),
        owner_id=current_user.id,
        title=f"{source.title} copy"[:255],
        description=source.description or "",
        board_profile=source.board_profile,
        project_version=source.project_version,
        payload=json.loads(json.dumps(source.payload or {}, ensure_ascii=False)),
        created_at=now,
        updated_at=now,
    )
    db.add(duplicate)
    db.commit()
    db.refresh(duplicate)
    return _response(duplicate)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _owned_project(project_id, current_user, db)
    db.delete(project)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
