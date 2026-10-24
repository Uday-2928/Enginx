"""Authenticated proxy for MATLAB-compatible GNU Octave script execution."""

from typing import Any, Dict, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from config import settings
from models import User
from security import get_current_user


router = APIRouter(prefix="/api/evaluation", tags=["Evaluation"])


class MatlabScriptRequest(BaseModel):
    code: str = Field(min_length=1, max_length=256 * 1024)
    time_limit_ms: int = Field(default=5000, ge=250, le=30000)
    memory_limit_mb: int = Field(default=256, ge=32, le=1024)


@router.post("/matlab/script")
async def execute_matlab_script(
    request: MatlabScriptRequest,
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    del current_user
    payload = {
        "code": request.code,
        "language": "matlab",
        "mode": "script",
        "test_cases": [],
        "time_limit_ms": request.time_limit_ms,
        "memory_limit_mb": request.memory_limit_mb,
    }
    try:
        async with httpx.AsyncClient(timeout=(request.time_limit_ms / 1000) + 5) as client:
            response = await client.post(settings.EVALUATION_SERVICE_URL, json=payload)
    except Exception:
        raise HTTPException(status_code=503, detail="GNU Octave evaluation service is unavailable; retry later.")

    if response.status_code >= 500 or response.status_code in (408, 429):
        raise HTTPException(status_code=503, detail="GNU Octave evaluation service is temporarily unavailable; retry later.")
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="GNU Octave evaluation service returned an invalid response.")
    try:
        result = response.json()
    except ValueError:
        raise HTTPException(status_code=502, detail="GNU Octave evaluation service returned invalid JSON.")
    if not isinstance(result, dict):
        raise HTTPException(status_code=502, detail="GNU Octave evaluation service returned an invalid result.")
    return result
