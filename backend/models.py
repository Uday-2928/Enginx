import uuid
import json
import math
import re
from datetime import datetime
from typing import List, Optional, Any, Dict, Literal
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from database import Base

# ==========================================
# SQLAlchemy ORM Models
# ==========================================

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=True)
    primary_role = Column(String(50), default="CSE") # CSE, ECE, AI, CYBER, ROBOTICS, HARDWARE
    branch = Column(String(100), nullable=True)
    specialization = Column(String(100), nullable=True)
    degree = Column(String(100), nullable=True)
    year = Column(Integer, nullable=True)
    goal = Column(String(255), nullable=True)
    weekly_hours = Column(Integer, nullable=True)
    ece_preferences = Column(JSON, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    xp = Column(Integer, default=0)
    streak_days = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    submissions = relationship("Submission", back_populates="user", cascade="all, delete-orphan")
    progress = relationship("UserProgress", back_populates="user", cascade="all, delete-orphan")
    badges = relationship("UserBadge", back_populates="user", cascade="all, delete-orphan")
    lesson_completions = relationship("LessonCompletion", back_populates="user", cascade="all, delete-orphan")
    virtual_hardware_projects = relationship("VirtualHardwareProject", back_populates="owner", cascade="all, delete-orphan")

class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(String(100), primary_key=True)
    slug = Column(String(120), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    discipline = Column(String(50), index=True, nullable=False) # 'cse', 'ece-verilog', 'ece-embedded', 'ai-ml', 'cybersecurity', 'robotics', 'hardware'
    difficulty = Column(String(20), nullable=False) # 'Easy', 'Medium', 'Hard'
    topic = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    starter_code = Column(Text, nullable=False)
    language = Column(String(50), nullable=False) # 'verilog', 'c', 'python', 'javascript'
    test_cases = Column(JSON, nullable=False) # list of dicts
    solution_hints = Column(JSON, default=list)
    time_limit_ms = Column(Integer, default=2000)
    memory_limit_mb = Column(Integer, default=128)
    tags = Column(JSON, default=list)
    xp_reward = Column(Integer, default=50)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    submissions = relationship("Submission", back_populates="challenge", cascade="all, delete-orphan")
    progress = relationship("UserProgress", back_populates="challenge", cascade="all, delete-orphan")

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    challenge_id = Column(String(100), ForeignKey("challenges.id"), nullable=False)
    code = Column(Text, nullable=False)
    language = Column(String(50), nullable=False)
    verdict = Column(String(20), nullable=False) # 'AC', 'WA', 'TLE', 'CE', 'RE', 'UNAVAILABLE'
    execution_time_ms = Column(Float, default=0.0)
    memory_used_kb = Column(Float, default=0.0)
    output = Column(Text, nullable=True)
    test_results = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="submissions")
    challenge = relationship("Challenge", back_populates="submissions")

class UserProgress(Base):
    __tablename__ = "user_progress"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    challenge_id = Column(String(100), ForeignKey("challenges.id"), nullable=False)
    completed = Column(Boolean, default=False)
    attempts_count = Column(Integer, default=1)
    best_execution_time_ms = Column(Float, nullable=True)
    xp_awarded = Column(Integer, default=0)
    first_completed_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="progress")
    challenge = relationship("Challenge", back_populates="progress")


class LessonCompletion(Base):
    """A durable, idempotent completion record for learning-experience lessons."""

    __tablename__ = "lesson_completions"
    __table_args__ = (
        UniqueConstraint("user_id", "lesson_id", name="uq_lesson_completion_user_lesson"),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    lesson_id = Column(String(100), nullable=False)
    completed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="lesson_completions")


class VirtualHardwareProject(Base):
    """Persisted circuit/source state; renderer objects never enter this table."""

    __tablename__ = "virtual_hardware_projects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False, default="")
    board_profile = Column(String(100), nullable=False)
    project_version = Column(Integer, nullable=False, default=1)
    payload = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    owner = relationship("User", back_populates="virtual_hardware_projects")

class Badge(Base):
    __tablename__ = "badges"

    id = Column(String(100), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    icon = Column(String(100), nullable=False)
    discipline = Column(String(50), nullable=False)
    criteria = Column(JSON, nullable=False)
    xp_bonus = Column(Integer, default=100)

class UserBadge(Base):
    __tablename__ = "user_badges"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    badge_id = Column(String(100), ForeignKey("badges.id"), nullable=False)
    awarded_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="badges")
    badge = relationship("Badge")

# ==========================================
# Pydantic Schemas
# ==========================================

class EcePreferences(BaseModel):
    """Validated personalization signals for the ECE Engineering Hub."""

    current_year: Optional[int] = Field(default=None, ge=1, le=10)
    current_semester: Optional[int] = Field(default=None, ge=1, le=16)
    electronics_level: Literal["new", "working", "confident"] = "new"
    c_programming_level: Literal["new", "working", "confident"] = "new"
    mathematics_level: Literal["new", "working", "confident"] = "new"
    digital_electronics_level: Literal["new", "working", "confident"] = "new"
    simulation_experience: Literal["new", "working", "confident"] = "new"
    weekly_hours: Optional[int] = Field(default=None, ge=1, le=168)
    preferred_learning_mode: Literal["guided", "practice", "projects", "mixed"] = "mixed"
    career_interests: List[str] = Field(default_factory=list)
    target_roles: List[str] = Field(default_factory=list)
    available_hardware: List[str] = Field(default_factory=list)

class UserBase(BaseModel):
    email: EmailStr
    name: str
    primary_role: Optional[str] = "CSE"
    branch: Optional[str] = Field(default=None, max_length=100)
    specialization: Optional[str] = Field(default=None, max_length=100)
    degree: Optional[str] = Field(default=None, max_length=100)
    year: Optional[int] = Field(default=None, ge=1, le=10)
    goal: Optional[str] = Field(default=None, max_length=255)
    weekly_hours: Optional[int] = Field(default=None, ge=0, le=168)
    ece_preferences: Optional[EcePreferences] = None
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)

class UserResponse(UserBase):
    id: str
    xp: int
    streak_days: int
    created_at: datetime

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    """Fields a current user may change from the learning profile."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    primary_role: Optional[str] = Field(default=None, max_length=50)
    branch: Optional[str] = Field(default=None, max_length=100)
    specialization: Optional[str] = Field(default=None, max_length=100)
    degree: Optional[str] = Field(default=None, max_length=100)
    year: Optional[int] = Field(default=None, ge=1, le=10)
    goal: Optional[str] = Field(default=None, max_length=255)
    weekly_hours: Optional[int] = Field(default=None, ge=0, le=168)
    ece_preferences: Optional[EcePreferences] = None
    avatar_url: Optional[str] = Field(default=None, max_length=500)

    class Config:
        extra = "forbid"

class ChallengeSummary(BaseModel):
    id: str
    slug: str
    title: str
    discipline: str
    difficulty: str
    topic: str
    language: str
    xp_reward: int
    tags: List[str]
    order_index: int

    class Config:
        from_attributes = True

class ChallengeDetail(ChallengeSummary):
    description: str
    starter_code: str
    test_cases: List[Dict[str, Any]]
    solution_hints: List[str]
    time_limit_ms: int
    memory_limit_mb: int

    class Config:
        from_attributes = True

class SubmissionCreate(BaseModel):
    challenge_id: str
    code: str
    language: str

class SubmissionResponse(BaseModel):
    id: str
    challenge_id: str
    language: str
    verdict: str
    execution_time_ms: float
    memory_used_kb: float
    output: Optional[str]
    test_results: List[Dict[str, Any]]
    xp_awarded: int = 0
    new_badges: List[str] = []
    status: str = "evaluated"
    retryable: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class SubmissionHistoryItem(BaseModel):
    """A persisted attempt without source code or award side effects."""

    id: str
    challenge_id: str
    language: str
    verdict: str
    execution_time_ms: float
    memory_used_kb: float
    output: Optional[str]
    test_results: List[Dict[str, Any]]
    status: str = "evaluated"
    retryable: bool = False
    created_at: datetime


class SubmissionHistoryResponse(BaseModel):
    """Recent attempts belonging to the authenticated learner."""

    items: List[SubmissionHistoryItem]


class LessonCompletionResponse(BaseModel):
    lesson_id: str
    completed: bool
    completed_at: datetime
    already_completed: bool = False


class CompletedLessonsResponse(BaseModel):
    """Durable lesson ids completed by the current demo user."""

    lesson_ids: List[str]


# ---------------------------------------------------------------------------
# Virtual Hardware Lab persistence schemas
# ---------------------------------------------------------------------------

VIRTUAL_HARDWARE_MAX_PAYLOAD_BYTES = 512 * 1024
VIRTUAL_HARDWARE_MAX_COMPONENTS = 100
VIRTUAL_HARDWARE_MAX_WIRES = 300
VIRTUAL_HARDWARE_BOARD_PROFILES = frozenset({
    "arduino-uno-r3",
    "esp32-devkit-v1",
    "raspberry-pi-4b",
    "raspberry-pi-pico",
})
VIRTUAL_HARDWARE_COMPONENT_TYPES = frozenset({
    "breadboard",
    "led",
    "resistor",
    "button",
    "potentiometer",
    "servo",
    "buzzer",
    "ldr",
    "dht11",
    "lcd1602",
})
VIRTUAL_HARDWARE_ENDPOINT_KINDS = frozenset({"board-pin", "component-pin", "breadboard-hole"})
VIRTUAL_HARDWARE_GUIDED_STEPS = frozenset({"build", "validate", "program", "simulate"})
VIRTUAL_HARDWARE_WIRE_COLORS = frozenset({"signal", "power", "ground", "custom"})
VIRTUAL_HARDWARE_BOARD_PIN_IDS = {
    "arduino-uno-r3": frozenset({*(f"D{index}" for index in range(14)), "A0", "A1", "A2", "A3", "5V", "3V3", "GND"}),
    "esp32-devkit-v1": frozenset({*(f"GPIO{gpio}" for gpio in (2, 4, 5, 12, 13, 14, 15, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33)), "3V3", "GND", "VIN"}),
    "raspberry-pi-4b": frozenset({"GPIO17", "GPIO18", "GPIO27", "GPIO22", "GPIO23", "GPIO24", "3V3", "GND"}),
    "raspberry-pi-pico": frozenset({"GP0", "GP1", "GP2", "GP3", "3V3", "GND"}),
}
VIRTUAL_HARDWARE_COMPONENT_PIN_IDS = {
    "breadboard": frozenset(),
    "led": frozenset({"anode", "cathode"}),
    "resistor": frozenset({"1", "2"}),
    "button": frozenset({"1", "2"}),
    "potentiometer": frozenset({"VCC", "SIG", "GND"}),
    "servo": frozenset({"VCC", "SIG", "GND"}),
    "buzzer": frozenset({"SIG", "GND"}),
    "ldr": frozenset({"VCC", "SIG", "GND"}),
    "dht11": frozenset({"VCC", "DATA", "GND"}),
    "lcd1602": frozenset({"VCC", "SDA", "GND"}),
}


def _validate_virtual_hardware_graph(value: Any) -> Dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError("graph must be an object")
    try:
        encoded = json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(",", ":"))
    except (TypeError, ValueError, RecursionError) as error:
        raise ValueError(f"graph must contain finite JSON values: {error}") from error
    if len(encoded.encode("utf-8")) > VIRTUAL_HARDWARE_MAX_PAYLOAD_BYTES:
        raise ValueError("project payload exceeds the 512 KiB limit")

    board_id = value.get("boardId")
    if not isinstance(board_id, str) or board_id not in VIRTUAL_HARDWARE_BOARD_PROFILES:
        raise ValueError("graph.boardId must be a supported board profile")
    components = value.get("components")
    wires = value.get("wires")
    if not isinstance(components, list) or len(components) > VIRTUAL_HARDWARE_MAX_COMPONENTS:
        raise ValueError("graph.components must be a list of at most 100 items")
    if not isinstance(wires, list) or len(wires) > VIRTUAL_HARDWARE_MAX_WIRES:
        raise ValueError("graph.wires must be a list of at most 300 items")

    component_ids: set[str] = set()
    for component in components:
        if not isinstance(component, dict):
            raise ValueError("each component must be an object")
        component_id = component.get("id")
        component_type = component.get("type")
        position = component.get("position")
        if not isinstance(component_id, str) or not component_id or len(component_id) > 100:
            raise ValueError("each component requires a stable id")
        if component_id in component_ids:
            raise ValueError("component ids must be unique")
        component_ids.add(component_id)
        if not isinstance(component_type, str) or not component_type or len(component_type) > 50:
            raise ValueError("each component requires a type")
        if component_type not in VIRTUAL_HARDWARE_COMPONENT_TYPES:
            raise ValueError("each component must use a supported component type")
        if not isinstance(position, list) or len(position) != 2 or not all(isinstance(item, (int, float)) and math.isfinite(item) for item in position):
            raise ValueError("component positions must be finite [x, y] values")
        rotation = component.get("rotation", 0)
        if not isinstance(rotation, (int, float)) or not math.isfinite(rotation):
            raise ValueError("component rotation must be finite")
        if "properties" in component and not isinstance(component["properties"], dict):
            raise ValueError("component properties must be an object")

    selected_id = value.get("selectedId")
    if selected_id is not None and selected_id != "board" and selected_id not in component_ids:
        raise ValueError("graph.selectedId must refer to a component or the board")

    wire_ids: set[str] = set()
    for wire in wires:
        if not isinstance(wire, dict):
            raise ValueError("each wire must be an object")
        wire_id = wire.get("id")
        if not isinstance(wire_id, str) or not wire_id or len(wire_id) > 120:
            raise ValueError("each wire requires a stable id")
        if wire_id in wire_ids:
            raise ValueError("wire ids must be unique")
        wire_ids.add(wire_id)
        for endpoint_name in ("from", "to"):
            endpoint = wire.get(endpoint_name)
            if not isinstance(endpoint, dict):
                raise ValueError(f"wire.{endpoint_name} must be an endpoint object")
            owner_id = endpoint.get("ownerId")
            pin_id = endpoint.get("pinId")
            kind = endpoint.get("kind")
            if not isinstance(owner_id, str) or not owner_id or not isinstance(pin_id, str) or not pin_id:
                raise ValueError(f"wire.{endpoint_name} must include ownerId and pinId")
            if kind not in VIRTUAL_HARDWARE_ENDPOINT_KINDS:
                raise ValueError(f"wire.{endpoint_name}.kind is not supported")
            if owner_id == "board" and kind != "board-pin":
                raise ValueError(f"wire.{endpoint_name} board endpoints must use board-pin kind")
            if owner_id == "breadboard-1" and kind != "breadboard-hole":
                raise ValueError(f"wire.{endpoint_name} breadboard endpoints must use breadboard-hole kind")
            if owner_id not in {"board", "breadboard-1"} and owner_id not in component_ids:
                raise ValueError(f"wire.{endpoint_name} refers to an unknown component")
            if owner_id not in {"board", "breadboard-1"} and kind != "component-pin":
                raise ValueError(f"wire.{endpoint_name} component endpoints must use component-pin kind")
            if owner_id == "board" and pin_id not in VIRTUAL_HARDWARE_BOARD_PIN_IDS[board_id]:
                raise ValueError(f"wire.{endpoint_name} refers to an unknown board pin")
            if owner_id == "breadboard-1" and not re.fullmatch(r"(?:[a-j](?:[1-9]|[12][0-9]|30)|[+-](?:[1-9]|[12][0-9]|30))", pin_id):
                raise ValueError(f"wire.{endpoint_name} refers to an invalid breadboard hole")
            if owner_id not in {"board", "breadboard-1"}:
                component_type_for_pin = next(component["type"] for component in components if component["id"] == owner_id)
                if pin_id not in VIRTUAL_HARDWARE_COMPONENT_PIN_IDS[component_type_for_pin]:
                    raise ValueError(f"wire.{endpoint_name} refers to an unknown component pin")

        color = wire.get("color", "signal")
        if color not in VIRTUAL_HARDWARE_WIRE_COLORS:
            raise ValueError("wire.color is not supported")
        waypoints = wire.get("waypoints", [])
        if not isinstance(waypoints, list) or len(waypoints) > 100 or any(
            not isinstance(point, list) or len(point) != 2 or not all(isinstance(item, (int, float)) and math.isfinite(item) for item in point)
            for point in waypoints
        ):
            raise ValueError("wire.waypoints must contain finite [x, y] points")

    return value


def _validate_completed_steps(value: Optional[List[str]]) -> Optional[List[str]]:
    if value is None:
        return value
    if len(value) > len(VIRTUAL_HARDWARE_GUIDED_STEPS):
        raise ValueError("completed_steps may contain at most four guided steps")
    if len(set(value)) != len(value) or any(step not in VIRTUAL_HARDWARE_GUIDED_STEPS for step in value):
        raise ValueError("completed_steps contains an unsupported or duplicate guided step")
    return value


def _validate_guided_step(value: Optional[str]) -> Optional[str]:
    if value is not None and value not in VIRTUAL_HARDWARE_GUIDED_STEPS:
        raise ValueError("guided_step must name a supported guided step")
    return value


class VirtualHardwareProjectCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(default="Untitled hardware project", min_length=1, max_length=255)
    description: str = Field(default="", max_length=2000)
    board_profile: str = Field(min_length=1, max_length=100)
    project_version: int = Field(default=1, ge=1, le=100)
    graph: Dict[str, Any]
    code: str = Field(default="", max_length=256 * 1024)
    guided_step: str = Field(default="build", max_length=50)
    completed_steps: List[str] = Field(default_factory=list, max_length=4)
    simulation_config: Dict[str, Any] = Field(default_factory=dict)

    _graph_is_safe = field_validator("graph")(_validate_virtual_hardware_graph)

    @field_validator("board_profile")
    @classmethod
    def supported_board_profile(cls, value: str) -> str:
        if value not in VIRTUAL_HARDWARE_BOARD_PROFILES:
            raise ValueError("board_profile must name a supported board profile")
        return value

    @field_validator("simulation_config")
    @classmethod
    def simulation_config_is_safe(cls, value: Dict[str, Any]) -> Dict[str, Any]:
        try:
            encoded = json.dumps(value, ensure_ascii=False, allow_nan=False)
        except (TypeError, ValueError, RecursionError) as error:
            raise ValueError(f"simulation_config must contain finite JSON values: {error}") from error
        if len(encoded.encode("utf-8")) > 32 * 1024:
            raise ValueError("simulation_config exceeds the 32 KiB limit")
        return value

    _completed_steps_are_safe = field_validator("completed_steps")(_validate_completed_steps)
    _guided_step_is_safe = field_validator("guided_step")(_validate_guided_step)


class VirtualHardwareProjectUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=2000)
    board_profile: Optional[str] = Field(default=None, min_length=1, max_length=100)
    project_version: Optional[int] = Field(default=None, ge=1, le=100)
    graph: Optional[Dict[str, Any]] = None
    code: Optional[str] = Field(default=None, max_length=256 * 1024)
    guided_step: Optional[str] = Field(default=None, max_length=50)
    completed_steps: Optional[List[str]] = Field(default=None, max_length=4)
    simulation_config: Optional[Dict[str, Any]] = None

    @field_validator("graph")
    @classmethod
    def graph_is_safe(cls, value: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if value is None:
            return value
        return _validate_virtual_hardware_graph(value)

    @field_validator("board_profile")
    @classmethod
    def supported_board_profile(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in VIRTUAL_HARDWARE_BOARD_PROFILES:
            raise ValueError("board_profile must name a supported board profile")
        return value

    _guided_step_is_safe = field_validator("guided_step")(_validate_guided_step)

    @field_validator("simulation_config")
    @classmethod
    def simulation_config_is_safe(cls, value: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if value is None:
            return value
        try:
            encoded = json.dumps(value, ensure_ascii=False, allow_nan=False)
        except (TypeError, ValueError, RecursionError) as error:
            raise ValueError(f"simulation_config must contain finite JSON values ({error})") from error
        if len(encoded.encode("utf-8")) > 32 * 1024:
            raise ValueError("simulation_config exceeds the 32 KiB limit")
        return value

    _completed_steps_are_safe = field_validator("completed_steps")(_validate_completed_steps)


class VirtualHardwareProjectSummary(BaseModel):
    id: str
    title: str
    description: str
    board_profile: str
    project_version: int
    created_at: datetime
    updated_at: datetime


class VirtualHardwareProjectResponse(VirtualHardwareProjectSummary):
    graph: Dict[str, Any]
    code: str
    guided_step: str
    completed_steps: List[str]
    simulation_config: Dict[str, Any]


class VirtualHardwareProjectListResponse(BaseModel):
    items: List[VirtualHardwareProjectSummary]
