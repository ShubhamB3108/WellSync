import os
from typing import List

class Settings:
    PROJECT_NAME: str = "WellSync"
    API_V1_STR: str = "/api/v1"
    
    # Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super-secret-wellsync-key-at-least-32-chars-long-123456")
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TTL_MIN: int = int(os.getenv("JWT_ACCESS_TTL_MIN", "15"))
    JWT_REFRESH_TTL_DAYS: int = int(os.getenv("JWT_REFRESH_TTL_DAYS", "7"))
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./wellsync.db")
    
    # Simulator & Scheduler
    SIMULATOR_TICK_SECONDS: int = int(os.getenv("SIMULATOR_TICK_SECONDS", "10"))
    SIMULATOR_ENABLED: bool = os.getenv("SIMULATOR_ENABLED", "true").lower() == "true"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    # ML Models path
    DYNO_MODEL_PATH: str = os.getenv("DYNO_MODEL_PATH", "backend/ml/models/dyno_classifier.joblib")

settings = Settings()
