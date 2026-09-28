import os
from typing import List

_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_DEFAULT_MODEL_PATH = os.path.join(_BASE_DIR, "ml", "models", "dyno_classifier.joblib")

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
    _cors_raw: str = os.getenv("CORS_ORIGINS", "")
    CORS_ORIGINS: List[str] = (
        [x.strip() for x in _cors_raw.split(",") if x.strip()]
        if _cors_raw
        else [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
            "*"
        ]
    )
    
    # ML Models path
    DYNO_MODEL_PATH: str = os.getenv("DYNO_MODEL_PATH", _DEFAULT_MODEL_PATH)

settings = Settings()

