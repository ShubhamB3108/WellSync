import pytest
from app.models.well import Well
from app.services.css_optimizer import optimize_css_parameters

def test_css_optimizer_feasibility_and_sor_ranking():
    well = Well(
        name="TEST-CSS",
        api_gravity=18.5,
        reservoir_temp_c=46.8,
        productivity_index=0.085
    )
    
    res = optimize_css_parameters(
        well=well,
        steam_volume_range=[200.0, 400.0],
        soak_time_hours_range=[48.0, 96.0],
        min_recovery_bbl=400.0,
        n_samples=50
    )
    
    candidates = res["candidates"]
    assert len(candidates) > 0
    # Verify sorted ascending by SOR
    for i in range(len(candidates) - 1):
        assert candidates[i]["predicted_sor"] <= candidates[i + 1]["predicted_sor"]
        
    # Check that coupled SRP impact is present
    top = candidates[0]
    assert "predicted_srp_impact" in top
    assert top["predicted_srp_impact"]["recommended_initial_spm"] > 0
    assert top["predicted_cumulative_oil_bbl"] >= 400.0
