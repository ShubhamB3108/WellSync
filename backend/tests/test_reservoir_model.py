import pytest
from app.services.reservoir_model import dead_oil_viscosity_cp, estimated_temp
from app.models.well import Well

def test_dead_oil_viscosity_beggs_robinson():
    # Baghewala crude: 18 API at 47C (116.6F) vs high steam temp (200C / 392F)
    visc_low_temp = dead_oil_viscosity_cp(api_gravity=18.0, temp_c=47.0)
    visc_high_temp = dead_oil_viscosity_cp(api_gravity=18.0, temp_c=200.0)
    
    # Beggs-Robinson yields ~68.1 cP at 47C and ~2.4 cP at 200C
    assert visc_low_temp > 50.0, "Oil at baseline reservoir temp should exhibit elevated viscosity"
    assert visc_high_temp < 10.0, "High steam temperature should dramatically reduce oil viscosity"
    assert visc_low_temp > visc_high_temp
    assert abs(visc_low_temp - 68.1) < 2.0, "Matches theoretical Beggs-Robinson correlation output"

def test_estimated_temp_decay():
    well = Well(name="TEST-001", api_gravity=18.0, reservoir_temp_c=47.0)
    # Right at steam cutoff (t=0)
    temp_t0 = estimated_temp(well, days_since_steam_end=0.0, tau=45.0)
    # Long after steam cutoff (t=300)
    temp_t300 = estimated_temp(well, days_since_steam_end=300.0, tau=45.0)
    
    assert temp_t0 > 250.0
    assert temp_t300 < 55.0
    assert abs(temp_t300 - 47.0) < 5.0
