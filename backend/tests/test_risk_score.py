from datetime import datetime, timezone
import pytest
from app.models.well import Well
from app.models.srp import DynoCard, SrpReading
from app.models.rod_failure import RodFailure
from app.services.rod_failure_risk import calculate_rod_failure_risk

def test_risk_score_increases_with_failures_and_fluid_pound():
    now = datetime.now(timezone.utc)
    
    # Healthy well
    well_low = Well(name="LOW-RISK", api_gravity=18.0, reservoir_temp_c=47.0)
    well_low.srp_readings = [SrpReading(spm=5.0, stroke_length_in=86.0)]
    well_low.dyno_cards = [DynoCard(pprl_lbf=15000.0, classification="normal", card_time=now)]
    well_low.rod_failures = []
    
    risk_low = calculate_rod_failure_risk(well_low)
    
    # Distressed well
    well_high = Well(name="HIGH-RISK", api_gravity=18.0, reservoir_temp_c=47.0)
    well_high.srp_readings = [SrpReading(spm=7.2, stroke_length_in=86.0)]
    well_high.dyno_cards = [
        DynoCard(pprl_lbf=18800.0, classification="fluid_pound", card_time=now),
        DynoCard(pprl_lbf=18500.0, classification="fluid_pound", card_time=now)
    ]
    well_high.rod_failures = [
        RodFailure(failure_type="fatigue", failure_time=now),
        RodFailure(failure_type="buckling", failure_time=now)
    ]
    
    risk_high = calculate_rod_failure_risk(well_high)
    
    assert risk_high["score"] > risk_low["score"]
    assert risk_high["band"] in ["medium", "high"]
