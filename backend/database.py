import os
from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
from config import settings


# SQLite waits at most this long for a held lock before giving up.  Without it a
# second writer sees "database is locked" immediately, which is what produced the
# intermittent 500s under concurrent submissions.
SQLITE_BUSY_TIMEOUT_MS = 5000


def _apply_sqlite_pragmas(dbapi_connection, _connection_record):
    """Configure per-connection SQLite pragmas.

    WAL lets readers proceed while a writer holds the database, which removes
    most of the locking contention.  ``busy_timeout`` converts a would-be
    immediate failure into a short wait.  ``foreign_keys`` is a no-op by default
    in SQLite unless enabled per connection, so it must be set here.
    """
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute(f"PRAGMA busy_timeout={SQLITE_BUSY_TIMEOUT_MS}")
    finally:
        cursor.close()


# Handle SQLite vs PostgreSQL configuration
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    # pool_pre_ping reuses only connections that still connect, avoiding the
    # stale-pool failures seen after the database is moved between runs.
    pool_pre_ping=True,
)

if settings.DATABASE_URL.startswith("sqlite"):
    event.listen(engine, "connect", _apply_sqlite_pragmas)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def ensure_sqlite_schema() -> None:
    """Add newly introduced nullable user columns without replacing an SQLite DB.

    ``Base.metadata.create_all`` creates tables but deliberately does not alter an
    existing table.  These additive columns are therefore applied separately for
    the repository's default SQLite deployment.  No existing data is rewritten or
    removed; fresh databases receive the columns through ``create_all``.
    """

    if engine.dialect.name != "sqlite":
        return

    inspector = inspect(engine)
    if not inspector.has_table("users"):
        return

    existing_columns = {column["name"] for column in inspector.get_columns("users")}
    profile_columns = {
        "branch": "VARCHAR(100)",
        "specialization": "VARCHAR(100)",
        "degree": "VARCHAR(100)",
        "year": "INTEGER",
        "goal": "VARCHAR(255)",
        "weekly_hours": "INTEGER",
        "ece_preferences": "JSON",
    }

    missing_columns = {
        name: declaration
        for name, declaration in profile_columns.items()
        if name not in existing_columns
    }
    if not missing_columns:
        return

    with engine.begin() as connection:
        for name, declaration in missing_columns.items():
            connection.execute(text(f"ALTER TABLE users ADD COLUMN {name} {declaration}"))

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
