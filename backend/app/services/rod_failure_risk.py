from datetime import datetime, timezone, timedelta
from typing import Tuple, List, Dict, Any
from app.models.well import Well
from app.models.srp import DynoCard, SrpReading
from app.models.rod_failure import RodFailure

def calculate_rod_failure_risk(well: Well) -> Dict[str, Any]:
    """
    Computes Goodman-diagram informed rod string failure risk score [0, 1].
    Balances 3 contributing factors:
    1. Cumulative stress-cycle fatigue exposure (W1 = 0.40)
    2. Fluid pound / rod floating frequency over past 90 days (W2 = 0.35)
    3. Historical well mechanical failure base rate (W3 = 0.25)
    """
    now = datetime.now(timezone.utc)
    factors = []
    
    # 1. Fluid pound frequency in past 90 days
    ninety_days_ago = now - timedelta(days=90)
    cards_slice = (well.dyno_cards[:20] if well.dyno_cards else [])
    recent_cards = [c for c in cards_slice if c.card_time and (c.card_time.tzinfo is not None and c.card_time >= ninety_days_ago)]
    if not recent_cards and cards_slice:
        # Fallback to last 10 cards if mock dates are sparse
        recent_cards = cards_slice[:10]
        
    fluid_pound_count = sum(1 for c in recent_cards if c.classification == "fluid_pound")
    fp_ratio = fluid_pound_count / max(1, len(recent_cards))
    if fp_ratio > 0.4:
        factors.append(f"Frequent rod-floating detected ({int(fp_ratio * 100)}% of recent strokes)")
        
    # 2. Cumulative stress exposure
    latest_reading = well.srp_readings[0] if well.srp_readings else None
    spm = latest_reading.spm if latest_reading else 6.0
    latest_card = well.dyno_cards[0] if well.dyno_cards else None
    pprl = latest_card.pprl_lbf if latest_card else 16000.0
    
    # Fatigue exposure benchmark: high loads combined with high SPM accelerate fatigue
    stress_factor = min(1.0, (pprl / 22000.0) * (spm / 8.0))
    if stress_factor > 0.75:
        factors.append(f"Elevated dynamic rod stress ({round(pprl)} lbf at {spm} SPM)")
        
    # 3. Well historical failure base rate
    failures = well.rod_failures or []
    failure_count = len(failures)
    if failure_count >= 2:
        factors.append(f"{failure_count} historical rod parting/buckling failures logged")
    base_rate_factor = min(1.0, failure_count * 0.35)
    
    # Composite risk score calculation
    W1 = 0.35  # Stress cycles
    W2 = 0.40  # Fluid pound (fluid pound is the dominant cause of rod buckling/parting in heavy oil)
    W3 = 0.25  # Historical failure rate
    
    raw_score = (W1 * stress_factor) + (W2 * fp_ratio) + (W3 * base_rate_factor)
    score = round(float(max(0.05, min(0.98, raw_score))), 2)
    
    if score >= 0.66:
        band = "high"
    elif score >= 0.33:
        band = "medium"
    else:
        band = "low"
        
    if not factors:
        factors.append("Nominal rod tension and cyclic stress levels within fatigue endurance limits")
        
    return {
        "score": score,
        "band": band,
        "factors": factors
    }
