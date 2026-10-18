import uuid
from datetime import datetime
from typing import List, Optional, Any, Dict
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from pydantic import BaseModel, EmailStr
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
    avatar_url = Column(String(500), nullable=True)
    xp = Column(Integer, default=0)
    streak_days = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    submissions = relationship("Submission", back_populates="user", cascade="all, delete-orphan")
    progress = relationship("UserProgress", back_populates="user", cascade="all, delete-orphan")
    badges = relationship("UserBadge", back_populates="user", cascade="all, delete-orphan")

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
    verdict = Column(String(20), nullable=False) # 'AC', 'WA', 'TLE', 'CE', 'RE'
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

class UserBase(BaseModel):
    email: EmailStr
    name: str
    primary_role: Optional[str] = "CSE"
    avatar_url: Optional[str] = None

class UserCreate(UserBase):
    password: Optional[str] = "enginx123"

class UserResponse(UserBase):
    id: str
    xp: int
    streak_days: int
    created_at: datetime

    class Config:
        from_attributes = True

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
    created_at: datetime

    class Config:
        from_attributes = True
