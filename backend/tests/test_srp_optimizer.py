import json
import pytest
from app.models.well import Well
from app.models.srp import DynoCard, SrpReading
from app.services.srp_optimizer import recommend_srp_setpoint, compute_rod_stress, API_GRADE_D_ALLOWABLE_STRESS_PSI
from app.ingestion.simulator import generate_dyno_card_points

def test_srp_stress_limit_enforcement():
    well = Well(name="TEST-SRP", api_gravity=18.0, reservoir_temp_c=47.0)
    
    # High load condition
    reading = SrpReading(spm=7.0, stroke_length_in=86.0)
    points = generate_dyno_card_points("fluid_pound", 86.0, pprl_lbf=18500.0, mprl_lbf=3500.0)
    card = DynoCard(
        pprl_lbf=18500.0,
        mprl_lbf=3500.0,
        card_area=25000.0,
        classification="fluid_pound",
        load_position_json=json.dumps(points)
    )
    
    rec = recommend_srp_setpoint(well, reading, card)
    assert rec["recommended_spm"] < reading.spm, "Fluid pound must trigger speed reduction"
    assert rec["is_safe"] is True
    assert rec["predicted_stress_psi"] <= API_GRADE_D_ALLOWABLE_STRESS_PSI
