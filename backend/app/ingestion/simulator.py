import json
import math
import random
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from app.models.well import Well
from app.models.css_cycle import CssCycle
from app.models.srp import SrpReading, DynoCard
from app.models.rod_failure import RodFailure
from app.models.alert import Alert
from app.services.dyno_classifier import classify_dyno_card, extract_features

def generate_dyno_card_points(
    card_type: str = "normal",
    stroke_length_in: float = 86.0,
    pprl_lbf: float = 16500.0,
    mprl_lbf: float = 4500.0,
    n_points: int = 50
) -> List[Dict[str, float]]:
    """
    Synthesizes physically realistic dynamometer card load-vs-position closed curves.
    """
    points = []
    half_points = n_points // 2
    
    # 1. UPSTROKE: Position goes 0 -> stroke_length_in
    for i in range(half_points):
        frac = i / float(half_points - 1)
        pos = frac * stroke_length_in
        
        if card_type == "normal":
            # Rapid load pickup, slight elastic stretch, then steady load with small rod vibration
            load = mprl_lbf + (pprl_lbf - mprl_lbf) * (1.0 - math.exp(-frac * 8.0))
            load += math.sin(frac * 12.0) * 250.0
        elif card_type == "fluid_pound":
            # Upstroke is normal
            load = mprl_lbf + (pprl_lbf - mprl_lbf) * (1.0 - math.exp(-frac * 8.0))
            load += math.sin(frac * 10.0) * 200.0
        elif card_type == "gas_interference":
            # Delayed load pickup because gas in pump chamber compresses
            load = mprl_lbf + (pprl_lbf - mprl_lbf) * (frac ** 2.2)
        elif card_type == "pump_off":
            # Very low load pickup because chamber is mostly vapor/vacuum
            load = mprl_lbf + (pprl_lbf - mprl_lbf) * 0.35 * (frac ** 1.5)
        elif card_type == "worn_valve":
            # Rounded corners, leakage reduces peak load
            load = mprl_lbf + (pprl_lbf - mprl_lbf) * 0.75 * math.sin(frac * math.pi / 2.0)
        else:
            load = mprl_lbf + (pprl_lbf - mprl_lbf) * frac
            
        points.append({"position_in": round(float(pos), 2), "load_lbf": round(float(load), 1)})
        
    # 2. DOWNSTROKE: Position goes stroke_length_in -> 0
    for i in range(half_points):
        frac = i / float(half_points - 1)
        pos = stroke_length_in * (1.0 - frac)
        
        if card_type == "normal":
            # Rapid load transfer to standing valve, then low rod load back to zero
            load = pprl_lbf - (pprl_lbf - mprl_lbf) * (1.0 - math.exp(-frac * 7.0))
            load += math.sin(frac * 10.0) * 150.0
        elif card_type == "fluid_pound":
            # THE CLASSIC SIGNATURE: traveling valve floats through empty barrel,
            # then violently impacts liquid level halfway down -> severe load drop & spike
            if frac < 0.45:
                # Load stays abnormally high because fluid has not been hit yet
                load = pprl_lbf * 0.90 + math.sin(frac * 8.0) * 300.0
            else:
                # Impact: sharp collapse ("backward-C" shape)
                impact_factor = (frac - 0.45) / 0.55
                load = mprl_lbf + (pprl_lbf * 0.90 - mprl_lbf) * math.exp(-impact_factor * 12.0)
                # Severe derivative spike and high harmonic vibration
                load += math.sin(impact_factor * 25.0) * (600.0 * (1.0 - impact_factor))
        elif card_type == "gas_interference":
            # Gas expands gradually on downstroke
            load = pprl_lbf - (pprl_lbf - mprl_lbf) * (frac ** 0.6)
        elif card_type == "pump_off":
            # Load collapses immediately to minimal work loop
            load = mprl_lbf + 400.0 * (1.0 - frac)
        elif card_type == "worn_valve":
            # Valve leaks, soft rounded bottom transition
            load = pprl_lbf - (pprl_lbf - mprl_lbf) * (math.sin(frac * math.pi / 2.0) ** 0.8)
        else:
            load = pprl_lbf - (pprl_lbf - mprl_lbf) * frac
            
        points.append({"position_in": round(float(pos), 2), "load_lbf": round(float(load), 1)})
        
    return points

def seed_demo_data(db: Session):
    """
    Seeds the exact demo environment specified in 02-backend.md §14:
    - 6 demo wells (BGW-001 through BGW-006)
    - BGW-003: pre-seeded with fluid-pound card and elevated risk
    - BGW-005: pre-seeded with >= 5 completed historical CSS cycles
    """
    existing_wells = db.query(Well).count()
    if existing_wells > 0:
        return
        
    wells_data = [
        {"name": "BGW-001", "api": 18.2, "temp": 46.5, "status": "active", "pi": 0.082},
        {"name": "BGW-002", "api": 17.8, "temp": 47.0, "status": "active", "pi": 0.075},
        {"name": "BGW-003", "api": 18.5, "temp": 46.8, "status": "active", "pi": 0.088},  # Fluid pound demo well
        {"name": "BGW-004", "api": 17.5, "temp": 47.5, "status": "active", "pi": 0.070},
        {"name": "BGW-005", "api": 18.9, "temp": 46.2, "status": "active", "pi": 0.095},  # Rich CSS history demo well
        {"name": "BGW-006", "api": 18.0, "temp": 47.2, "status": "active", "pi": 0.078},
    ]
    
    now = datetime.now(timezone.utc)
    
    for w_info in wells_data:
        well = Well(
            name=w_info["name"],
            field_name="Baghewala",
            reservoir_formation="Jodhpur Sandstone",
            api_gravity=w_info["api"],
            reservoir_temp_c=w_info["temp"],
            reservoir_pressure_kpa=14500.0,
            productivity_index=w_info["pi"],
            status=w_info["status"]
        )
        db.add(well)
        db.flush()
        
        # Determine cycles to seed
        num_cycles = 5 if well.name == "BGW-005" else 2
        for c_idx in range(1, num_cycles + 1):
            is_last = (c_idx == num_cycles)
            cycle_status = "producing" if is_last else "completed"
            start_date = now - timedelta(days=(num_cycles - c_idx + 1) * 110)
            end_date = start_date + timedelta(days=5)
            
            cycle = CssCycle(
                well_id=well.id,
                cycle_number=c_idx,
                steam_volume_m3=280.0 + (c_idx * 15.0),
                injection_pressure_kpa=12500.0,
                steam_temp_c=315.0,
                soak_time_hours=72.0,
                injection_start=start_date,
                injection_end=end_date,
                production_start=end_date + timedelta(days=3),
                production_cutoff=start_date + timedelta(days=95) if not is_last else None,
                cumulative_oil_bbl=520.0 + (c_idx * 40.0) if not is_last else 380.0,
                status=cycle_status,
                is_ai_recommended=(c_idx > 1)
            )
            db.add(cycle)
            
        # Determine card type and mechanical conditions
        if well.name == "BGW-003":
            # BGW-003: Fluid pound condition
            card_type = "fluid_pound"
            spm = 6.8
            pprl = 18200.0
            mprl = 3800.0
            # Add past rod failure history to elevate risk score
            failure = RodFailure(
                well_id=well.id,
                failure_time=now - timedelta(days=45),
                failure_type="fatigue",
                depth_ft=2100.0,
                downtime_hours=36.0,
                is_synthetic=True
            )
            db.add(failure)
            failure2 = RodFailure(
                well_id=well.id,
                failure_time=now - timedelta(days=160),
                failure_type="buckling",
                depth_ft=2250.0,
                downtime_hours=48.0,
                is_synthetic=True
            )
            db.add(failure2)
        elif well.name == "BGW-004":
            card_type = "gas_interference"
            spm = 5.2
            pprl = 15200.0
            mprl = 4800.0
        else:
            card_type = "normal"
            spm = 5.8
            pprl = 16400.0
            mprl = 4200.0
            
        stroke_length = 86.0
        
        # Seed 3 recent dyno cards
        for card_i in range(3):
            card_points = generate_dyno_card_points(
                card_type=card_type if card_i == 0 else "normal",
                stroke_length_in=stroke_length,
                pprl_lbf=pprl,
                mprl_lbf=mprl
            )
            pred_class, conf, feats = classify_dyno_card(card_points)
            card = DynoCard(
                well_id=well.id,
                card_time=now - timedelta(hours=card_i * 6),
                load_position_json=json.dumps(card_points),
                pprl_lbf=feats["pprl_lbf"],
                mprl_lbf=feats["mprl_lbf"],
                card_area=feats["card_area"],
                classification=pred_class,
                classification_confidence=conf,
                is_synthetic=True
            )
            db.add(card)
            
        # Seed latest SRP reading
        reading = SrpReading(
            well_id=well.id,
            reading_time=now,
            spm=spm,
            stroke_length_in=stroke_length,
            vfd_frequency_hz=48.0,
            polished_rod_load_lbf=pprl,
            motor_current_a=24.5,
            estimated_fluid_level_m=340.0
        )
        db.add(reading)
        
        # If BGW-003, also seed an active Alert
        if well.name == "BGW-003":
            alert = Alert(
                well_id=well.id,
                alert_type="fluid_pound",
                severity="critical",
                message="Fluid pound detected (rod-floating signature, 87% confidence). Immediate SPM reduction recommended to prevent rod fatigue failure."
            )
            db.add(alert)
            
    db.commit()

def run_simulator_tick(db: Session):
    """
    Executes one background simulation tick across active wells.
    Generates new SRP reading and updates latest dyno card.
    """
    wells = db.query(Well).filter(Well.status == "active").all()
    now = datetime.now(timezone.utc)
    
    for well in wells:
        latest_card = well.dyno_cards[0] if well.dyno_cards else None
        current_class = latest_card.classification if latest_card else "normal"
        
        # BGW-003 stays in fluid pound unless speed has been reduced
        latest_reading = well.srp_readings[0] if well.srp_readings else None
        spm = latest_reading.spm if latest_reading else 6.0
        
        if well.name == "BGW-003" and spm > 5.2:
            card_type = "fluid_pound"
        elif well.name == "BGW-003" and spm <= 5.2:
            card_type = "normal"  # mitigated!
        elif well.name == "BGW-004":
            card_type = "gas_interference"
        else:
            card_type = "normal"
            
        stroke_length = 86.0
        points = generate_dyno_card_points(
            card_type=card_type,
            stroke_length_in=stroke_length,
            pprl_lbf=16500.0 + random.uniform(-300, 300),
            mprl_lbf=4500.0 + random.uniform(-200, 200)
        )
        pred_class, conf, feats = classify_dyno_card(points)
        
        card = DynoCard(
            well_id=well.id,
            card_time=now,
            load_position_json=json.dumps(points),
            pprl_lbf=feats["pprl_lbf"],
            mprl_lbf=feats["mprl_lbf"],
            card_area=feats["card_area"],
            classification=pred_class,
            classification_confidence=conf,
            is_synthetic=True
        )
        db.add(card)
        
        reading = SrpReading(
            well_id=well.id,
            reading_time=now,
            spm=spm + round(random.uniform(-0.1, 0.1), 1),
            stroke_length_in=stroke_length,
            vfd_frequency_hz=round(spm * 8.0, 1),
            polished_rod_load_lbf=feats["pprl_lbf"],
            motor_current_a=round(24.0 + random.uniform(-1.0, 1.0), 1),
            estimated_fluid_level_m=340.0 + round(random.uniform(-5.0, 5.0), 1)
        )
        db.add(reading)
        
    db.commit()
    prune_old_simulation_data(db, max_per_well=50)

def prune_old_simulation_data(db: Session, max_per_well: int = 50):
    """
    Keeps memory footprint and database size strictly bounded by retaining only
    the latest max_per_well records per well.
    """
    try:
        from sqlalchemy import text
        db.execute(text("""
            DELETE FROM dyno_cards WHERE id IN (
                SELECT id FROM (
                    SELECT id, ROW_NUMBER() OVER (PARTITION BY well_id ORDER BY card_time DESC) as rn
                    FROM dyno_cards
                ) t WHERE t.rn > :max_per_well
            );
        """), {"max_per_well": max_per_well})
        db.execute(text("""
            DELETE FROM srp_readings WHERE id IN (
                SELECT id FROM (
                    SELECT id, ROW_NUMBER() OVER (PARTITION BY well_id ORDER BY reading_time DESC) as rn
                    FROM srp_readings
                ) t WHERE t.rn > :max_per_well
            );
        """), {"max_per_well": max_per_well})
        db.commit()
    except Exception:
        db.rollback()

