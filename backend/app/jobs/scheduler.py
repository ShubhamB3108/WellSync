from apscheduler.schedulers.background import BackgroundScheduler
from app.core.config import settings
from app.core.database import SessionLocal
from app.ingestion.simulator import run_simulator_tick
from app.models.well import Well
from app.models.alert import Alert
from app.services.rod_failure_risk import calculate_rod_failure_risk

scheduler = BackgroundScheduler()

def scheduled_simulator_tick():
    db = SessionLocal()
    try:
        run_simulator_tick(db)
        
        # Periodically evaluate alerts across wells
        wells = db.query(Well).filter(Well.status == "active").all()
        for well in wells:
            latest_card = well.dyno_cards[0] if well.dyno_cards else None
            if latest_card and latest_card.classification == "fluid_pound":
                # Check if unacknowledged alert already exists
                existing = db.query(Alert).filter(
                    Alert.well_id == well.id,
                    Alert.alert_type == "fluid_pound",
                    Alert.acknowledged_at == None
                ).first()
                if not existing:
                    alert = Alert(
                        well_id=well.id,
                        alert_type="fluid_pound",
                        severity="critical",
                        message=f"Fluid pound / rod-floating signature detected on {well.name} (confidence: {round(latest_card.classification_confidence or 0.85, 2)})."
                    )
                    db.add(alert)
                    db.commit()
            
            # Risk score threshold alert
            risk = calculate_rod_failure_risk(well)
            if risk["score"] >= 0.70:
                existing_risk_alert = db.query(Alert).filter(
                    Alert.well_id == well.id,
                    Alert.alert_type == "high_risk",
                    Alert.acknowledged_at == None
                ).first()
                if not existing_risk_alert:
                    alert = Alert(
                        well_id=well.id,
                        alert_type="high_risk",
                        severity="warning",
                        message=f"Rod failure risk score reached {risk['score']} ({risk['band']} band) for {well.name}."
                    )
                    db.add(alert)
                    db.commit()
    except Exception as e:
        print(f"Error in scheduled simulator tick: {e}")
    finally:
        db.close()
        import gc
        gc.collect()

def start_scheduler():
    if not scheduler.running:
        if settings.SIMULATOR_ENABLED:
            scheduler.add_job(
                scheduled_simulator_tick,
                "interval",
                seconds=settings.SIMULATOR_TICK_SECONDS,
                id="simulator_tick",
                max_instances=1,
                coalesce=True,
                misfire_grace_time=30,
                replace_existing=True
            )
        
        scheduler.start()
        print("APScheduler background tasks started.")

def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        print("APScheduler background tasks stopped.")
