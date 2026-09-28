import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))
from app.core.database import init_db, SessionLocal
from app.main import seed_demo_users
from app.ingestion.simulator import seed_demo_data

def run_seed():
    print("Initializing database...")
    init_db()
    db = SessionLocal()
    try:
        print("Seeding demo users...")
        seed_demo_users(db)
        print("Seeding demo wells and operational telemetry...")
        seed_demo_data(db)
        print("Seed completed successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
