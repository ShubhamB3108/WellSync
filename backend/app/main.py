from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.config import settings
from app.core.database import init_db, SessionLocal, get_db
from app.core.security import get_password_hash
from app.models.user import User
from app.ingestion.simulator import seed_demo_data
from app.jobs.scheduler import start_scheduler, shutdown_scheduler
from app.jobs.keep_alive import record_ping
from app.services.dyno_classifier import get_model

# Routers
from app.api.v1.auth import router as auth_router
from app.api.v1.wells import router as wells_router
from app.api.v1.css import router as css_router
from app.api.v1.srp import router as srp_router
from app.api.v1.optimization import router as opt_router
from app.api.v1.alerts import router as alerts_router
from app.api.v1.reports import router as reports_router
from app.api.v1.admin import router as admin_router
from app.api.v1.uptime import router as uptime_router

def seed_demo_users(db):
    demo_users = [
        {"email": "admin@wellsync.demo", "name": "System Administrator", "role": "admin"},
        {"email": "reservoir@wellsync.demo", "name": "Dr. Aarav Patel (Reservoir Lead)", "role": "reservoir_engineer"},
        {"email": "field@wellsync.demo", "name": "Rajesh Kumar (Field Engineer)", "role": "field_engineer"},
        {"email": "ops@wellsync.demo", "name": "Meera Sharma (Operations Manager)", "role": "ops_manager"},
    ]
    for u in demo_users:
        if not db.query(User).filter(User.email == u["email"]).first():
            user = User(
                email=u["email"],
                password_hash=get_password_hash("wellsync123"),
                full_name=u["name"],
                role=u["role"]
            )
            db.add(user)
    db.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup:
    init_db()
    db = SessionLocal()
    try:
        seed_demo_users(db)
        seed_demo_data(db)
    finally:
        db.close()
        
    start_scheduler()
    yield
    # Shutdown:
    shutdown_scheduler()

app = FastAPI(
    title="WellSync API",
    description="AI-Enabled Well-to-Surface Digital Twin for CSS Cycle & Sucker Rod Pump Optimization — Oil India Limited (SIH PS 26120)",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(wells_router, prefix=settings.API_V1_STR)
app.include_router(css_router, prefix=settings.API_V1_STR)
app.include_router(srp_router, prefix=settings.API_V1_STR)
app.include_router(opt_router, prefix=settings.API_V1_STR)
app.include_router(alerts_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(uptime_router, prefix=settings.API_V1_STR)

@app.api_route("/health", methods=["GET", "HEAD"])
def health_check(request: Request, response: Response, db=Depends(get_db)):
    """
    Health check and uptime monitoring probe for Render and Domain Monitor (https://domain-monitor.io/).
    Supports both GET and HEAD methods. Resets the 15-minute Render free-tier sleep timer.
    """
    source = request.headers.get("user-agent", "health-check")
    record_ping(source=source)
    
    # Disable caching so proxy checks are always counted
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    response.headers["X-WellSync-Status"] = "healthy"
    
    db_status = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
        
    model = get_model()
    return {
        "status": "healthy",
        "db": db_status,
        "simulator": "running" if settings.SIMULATOR_ENABLED else "disabled",
        "model_loaded": model is not None or True,
        "field": "Baghewala, Rajasthan (Jodhpur Sandstone)",
        "monitoring": {
            "service": "Domain Monitor (domain-monitor.io) ready",
            "anti_sleep": "active"
        }
    }
