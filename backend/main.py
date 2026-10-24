"""
EnginX Main Backend API Application
"""
import os
import sys

if sys.platform == "win32":
    # Windows' default ProactorEventLoop mishandles HTTP keep-alive: a client
    # that drops a connection makes asyncio call sock.shutdown() on an already
    # reset socket, raising ConnectionResetError [WinError 10054] and leaving a
    # desynchronised socket that turns the next request into "400 Bad Request".
    # On Windows that broke login/signup preflights and dropped the app to a
    # blank screen.  The SelectorEventLoop handles abrupt disconnects cleanly.
    # It must be installed before uvicorn creates its event loop, so it is set
    # during import of this module.
    import asyncio

    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    except (AttributeError, ImportError):
        # Event loop policies were removed in newer Python releases; on those
        # builds the policy-based workaround simply does not apply and uvicorn
        # keeps its default loop.  Never let startup fail because of this hint.
        pass

import logging
import os

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from config import DATABASE_FILE, settings
from database import engine, Base, SessionLocal, ensure_sqlite_schema
from seed_data import seed_database

# Import routers
from routers.auth import router as auth_router
from routers.challenges import router as challenges_router
from routers.submissions import router as submissions_router
from routers.progress import router as progress_router
from routers.badges import router as badges_router
from routers.leaderboard import router as leaderboard_router
from routers.profile import router as profile_router
from routers.virtual_hardware import router as virtual_hardware_router
from routers.evaluation import router as evaluation_router
from routers.cybersecurity import router as cybersecurity_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("enginx.main")

# ---------------------------------------------------------------------------
# Database initialisation
# ---------------------------------------------------------------------------
# This runs at import time on purpose.  ``test_api.py`` imports ``main`` without
# opening a TestClient context manager, so a FastAPI startup event would never
# fire there and the legacy-table migration would be silently skipped.  Keeping
# it here means every importer gets a usable database.
#
# The failure behaviour is intentional and asymmetric:
#
#   schema creation  -> HARD FAIL.  Without tables nothing can work and the
#                       process must not pretend to be healthy.
#   seeding          -> LOG AND CONTINUE.  Idempotent reference data; a partial
#                       database is still servable and the error is diagnosable.
# ---------------------------------------------------------------------------
def initialise_database() -> None:
    """Create tables, apply the additive SQLite migration and seed data."""
    logger.info("Initialising EnginX database at %s", DATABASE_FILE or settings.DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    ensure_sqlite_schema()

    db = SessionLocal()
    try:
        seed_database(db)
    except Exception:
        logger.exception("Failed to seed the database; serving without reseeded data.")
    finally:
        db.close()


# A stale ``enginx.db`` left locked by a previous server run, or an older schema
# that cannot be migrated, is the most common reason the backend fails to come
# up at all.  Raise here rather than serving a broken process: a traceback at
# import time is unambiguous, whereas a half-initialised server answers
# requests that all fail the same way and hide the cause.
initialise_database()

app = FastAPI(
    title="EnginX API",
    description="Full-stack multi-discipline engineering learning platform API",
    version="1.0.0"
)

# ---------------------------------------------------------------------------
# CORS Middleware
# ---------------------------------------------------------------------------
# Registered exactly once.  Duplicate registrations are a common source of
# preflight failures, because the inner and outer middleware can disagree about
# which request is being handled.
#
# Two things here are deliberate:
#
#   * ``allow_methods`` lists the methods the API actually supports rather than
#     ``["*"]``.  Starlette matches the preflight's
#     ``Access-Control-Request-Method`` header against ``allow_methods``; when
#     that header is absent the preflight is rejected with 400 regardless of the
#     wildcard.  The explicit list is also what reaches the response's
#     ``Access-Control-Allow-Methods`` header.
#
#   * Origins come from ALLOWED_ORIGINS and include both the localhost and
#     127.0.0.1 spellings, since the browser sends whichever one it was served
#     from.  A wildcard origin is not usable here: it cannot be combined with
#     ``allow_credentials=True``.
# ---------------------------------------------------------------------------
ALLOWED_HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]
ALLOWED_HTTP_HEADERS = [
    "Authorization",
    "Content-Type",
    "Accept",
    "Origin",
    "X-Requested-With",
    "Referer",
]

allowed_origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or ["*"],
    allow_credentials=True,
    allow_methods=ALLOWED_HTTP_METHODS,
    allow_headers=ALLOWED_HTTP_HEADERS,
)

# Register routers
app.include_router(auth_router)
app.include_router(challenges_router)
app.include_router(submissions_router)
app.include_router(progress_router)
app.include_router(badges_router)
app.include_router(leaderboard_router)
app.include_router(profile_router)
app.include_router(virtual_hardware_router)
app.include_router(evaluation_router)
app.include_router(cybersecurity_router)

@app.get("/")
def root():
    return {
        "platform": "EnginX",
        "tagline": "Master the hands-on skills that power tomorrow's technology",
        "status": "online",
        "version": "1.0.0",
        "disciplines": [
            "Computer Science (CSE)",
            "ECE - Verilog HDL",
            "ECE - Embedded C",
            "Artificial Intelligence & Machine Learning",
            "Cybersecurity & CTF",
            "Robotics & Control",
            "General Hardware & Logic Gates"
        ]
    }

@app.get("/health")
def health():
    """Liveness probe that also reveals the resolved database path.

    When running in Docker the SQLite file should live under ``/app/data``;
    on bare-metal Windows/Linux it points at whatever ``DATABASE_FILE``
    resolved to.  Seeing this value in the response lets an operator confirm
    persistence is wired correctly without guessing.
    """
    db_location = DATABASE_FILE or settings.DATABASE_URL
    return {
        "status": "healthy",
        "database": db_location,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
