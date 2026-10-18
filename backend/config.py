import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "EnginX API"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./enginx.db")
    EVALUATION_SERVICE_URL: str = os.getenv("EVALUATION_SERVICE_URL", "http://localhost:8001/api/evaluate")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super-secret-enginx-key-change-me")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173")

    class Config:
        env_file = ".env"

settings = Settings()
