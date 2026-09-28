import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.well import Well
from app.models.optimization import OptimizationRun
from app.services.reservoir_model import calibrate_tau, estimated_temp, estimated_viscosity
from app.services.srp_optimizer import estimate_fillage_pct
from app.services.rod_failure_risk import calculate_rod_failure_risk

_state_cache: Dict[str, Dict[str, Any]] = {}

def get_digital_twin_state(db: Session, well: Well, force_refresh: bool = False) -> Dict[str, Any]:
    """
    Computes and aggregates the unified Digital Twin State for a single well.
    Fuses thermal decline, dynamic viscosity, SRP conditions, and mechanical risk.
    """
    well_id = well.id
    now = datetime.now(timezone.utc)
    
    # 1. Reservoir calculations
    last_cycle = None
    days_since_steam = 25.0
    if well.css_cycles:
        last_cycle = sorted(well.css_cycles, key=lambda c: c.cycle_number)[-1]
        if last_cycle.injection_end:
            # calculate days since injection ended
            delta = now - (last_cycle.injection_end if last_cycle.injection_end.tzinfo else last_cycle.injection_end.replace(tzinfo=timezone.utc))
            days_since_steam = max(1.0, delta.total_seconds() / 86400.0)
            
    tau, conf = calibrate_tau(well, well.css_cycles or [])
    curr_temp = estimated_temp(well, days_since_steam, tau=tau)
    curr_visc = estimated_viscosity(well, days_since_steam, tau=tau)
    
    # 2. SRP and Dyno card state
    latest_reading = well.srp_readings[0] if well.srp_readings else None
    latest_card = well.dyno_cards[0] if well.dyno_cards else None
    
    current_spm = latest_reading.spm if latest_reading else 6.2
    stroke_length = latest_reading.stroke_length_in if latest_reading else 86.0
    fillage = estimate_fillage_pct(latest_card, stroke_length)
    
    # 3. Rod failure risk
    risk = calculate_rod_failure_risk(well)
    
    # 4. Pending recommendations
    pending_runs = db.query(OptimizationRun).filter(
        OptimizationRun.well_id == well_id,
        OptimizationRun.status == "pending"
    ).order_by(OptimizationRun.requested_at.desc()).all()
    
    pending_list = []
    for r in pending_runs:
        try:
            rec_params = json.loads(r.recommended_params_json) if r.recommended_params_json else {}
            pred_metrics = json.loads(r.predicted_metrics_json) if r.predicted_metrics_json else {}
        except Exception:
            rec_params = {}
            pred_metrics = {}
        pending_list.append({
            "id": r.id,
            "run_type": r.run_type,
            "requested_at": r.requested_at.isoformat(),
            "status": r.status,
            "recommended_params": rec_params,
            "predicted_metrics": pred_metrics
        })
        
    state = {
        "well_id": well.id,
        "well_name": well.name,
        "api_gravity": well.api_gravity,
        "reservoir_temp_baseline_c": well.reservoir_temp_c,
        "computed_at": now.isoformat(),
        "reservoir": {
            "estimated_temp_c": round(curr_temp, 1),
            "days_since_last_steam": round(days_since_steam, 1),
            "estimated_viscosity_cp": round(curr_visc, 1),
            "forecast_confidence": conf
        },
        "current_cycle": {
            "id": last_cycle.id if last_cycle else None,
            "cycle_number": last_cycle.cycle_number if last_cycle else 1,
            "status": last_cycle.status if last_cycle else "producing",
            "steam_volume_m3": last_cycle.steam_volume_m3 if last_cycle else 320.0,
            "soak_time_hours": last_cycle.soak_time_hours if last_cycle else 72.0,
            "cumulative_oil_bbl": last_cycle.cumulative_oil_bbl if last_cycle else 540.0
        } if last_cycle else None,
        "srp": {
            "latest_card_id": latest_card.id if latest_card else None,
            "classification": latest_card.classification if latest_card else "normal",
            "classification_confidence": latest_card.classification_confidence if latest_card else 0.90,
            "estimated_fillage_pct": round(fillage, 1),
            "current_spm": round(current_spm, 1),
            "stroke_length_in": round(stroke_length, 1),
            "vfd_frequency_hz": latest_reading.vfd_frequency_hz if latest_reading else 48.0
        },
        "rod_failure_risk": risk,
        "pending_recommendations": pending_list
    }
    
    _state_cache[well_id] = state
    return state
