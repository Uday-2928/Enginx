"""
EnginX Main Backend API Application
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from database import engine, Base, SessionLocal
from seed_data import seed_database

# Import routers
from routers.auth import router as auth_router
from routers.challenges import router as challenges_router
from routers.submissions import router as submissions_router
from routers.progress import router as progress_router
from routers.badges import router as badges_router
from routers.leaderboard import router as leaderboard_router

# Initialize database tables
Base.metadata.create_all(bind=engine)

# Auto-seed database with all 6 discipline challenges and badges
with SessionLocal() as db:
    seed_database(db)

app = FastAPI(
    title="EnginX API",
    description="Full-stack multi-discipline engineering learning platform API",
    version="1.0.0"
)

# CORS Middleware
origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(challenges_router)
app.include_router(submissions_router)
app.include_router(progress_router)
app.include_router(badges_router)
app.include_router(leaderboard_router)

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
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
