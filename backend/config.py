import os
from pathlib import Path
from urllib.parse import unquote

from sqlalchemy.engine import make_url
from pydantic_settings import BaseSettings


def resolve_sqlite_path(url: str) -> str | None:
    """Return the absolute path for a sqlite URL, or ``None`` for other dialects.

    Relative database paths are resolved against the process working directory.
    That matters: ``sqlite:///./enginx.db`` resolves against ``os.getcwd()``, not
    against this module's directory, so running uvicorn from a different folder
    silently creates a brand-new empty database and hides the real one.

    Resolving here and creating the parent directory guarantees the database
    lands in the configured location instead of wherever the shell happened to be.
    """
    if not url.startswith("sqlite"):
        return None

    database = make_url(url).database
    if not database:
        raise RuntimeError(
            f"The DATABASE_URL {url!r} does not name a database file. "
            "Refusing to start against an ambiguous SQLite location."
        )
    if database.startswith(":memory:"):
        # SQLite memory databases have no filesystem location, and every
        # connection would see a different empty database.  A web server that
        # silently used one would lose all writes, so refuse to resolve it.
        raise RuntimeError(
            "The DATABASE_URL points at an in-memory SQLite database "
            '(:memory:), which cannot persist a multi-process web server.'
        )

    # SQLAlchemy percent-encodes special characters inside the URL.  Decode them
    # before treating the value as a filesystem path, otherwise ``%2F`` would be
    # interpreted as part of the filename rather than as a path separator.
    db_path = Path(unquote(database))
    if not db_path.is_absolute():
        db_path = Path.cwd() / db_path

    try:
        db_path.parent.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        raise RuntimeError(
            f"Cannot create the SQLite directory {db_path.parent}: {exc}"
        ) from exc

    return str(db_path)


class Settings(BaseSettings):
    PROJECT_NAME: str = "EnginX API"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./enginx.db")
    EVALUATION_SERVICE_URL: str = os.getenv("EVALUATION_SERVICE_URL", "http://localhost:8001/api/evaluate")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super-secret-enginx-key-change-me")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    ALLOWED_ORIGINS: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:3000,"
        "http://127.0.0.1:5173,http://127.0.0.1:3000",
    )

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

# Module-level rather than an attribute on ``settings``: assigning an undeclared
# field to a pydantic-settings model raises ValueError and would crash startup.
DATABASE_FILE: str | None = resolve_sqlite_path(settings.DATABASE_URL)

