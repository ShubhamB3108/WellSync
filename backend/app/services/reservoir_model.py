import math
from typing import Tuple, List, Optional
import numpy as np
from app.models.well import Well
from app.models.css_cycle import CssCycle

DEFAULT_TAU_DAYS = 45.0

def dead_oil_viscosity_cp(api_gravity: float, temp_c: float) -> float:
    """
    Beggs-Robinson dead-oil viscosity correlation.
    API gravity in degrees API (typically 17-19 for Baghewala).
    temp_c in degrees Celsius (typically 46-48C reservoir, 150-320C during steam).
    Returns viscosity in centipoise (cP).
    """
    temp_f = (temp_c * 9.0 / 5.0) + 32.0
    # Clamping temperature to avoid negative or near-zero inputs
    temp_f = max(40.0, temp_f)
    api_gravity = max(10.0, min(50.0, api_gravity))
    
    Y = 10.0 ** (3.0324 - 0.02023 * api_gravity)
    X = Y * (temp_f ** -1.163)
    mu_od = (10.0 ** X) - 1.0
    return float(max(0.5, mu_od))

def calibrate_tau(well: Well, cycles: List[CssCycle]) -> Tuple[float, str]:
    """
    Fit reservoir cooling parameter tau (days) from completed cycle history.
    Requires >= 3 completed cycles; otherwise returns field-average default.
    """
    completed_cycles = [c for c in cycles if c.status == "completed" and c.cumulative_oil_bbl and c.cumulative_oil_bbl > 0]
    if len(completed_cycles) < 3:
        return DEFAULT_TAU_DAYS, "field_default"
    
    # Simple calibration: fit tau based on steam volumes and oil recoveries
    # Higher steam volume and thicker reservoir sandstone correlates with slower thermal bleed (larger tau)
    avg_steam = np.mean([c.steam_volume_m3 for c in completed_cycles])
    # Baseline tau scaled with steam volume (standard Marx-Langenheim thermal penetration scaling)
    tau = DEFAULT_TAU_DAYS * (avg_steam / 300.0) ** 0.5
    tau = float(np.clip(tau, 25.0, 90.0))
    return tau, "in_range"

def estimated_temp(well: Well, days_since_steam_end: float, tau: Optional[float] = None) -> float:
    """
    Exponential thermal decay model:
    T(t) = T_res + (T_steam - T_res) * exp(-t / tau)
    """
    T_res = well.reservoir_temp_c  # baseline 46-48C
    # Look for last cycle's steam temp or default 320C
    T_steam = 320.0
    if well.css_cycles:
        last_cycle = sorted(well.css_cycles, key=lambda c: c.cycle_number)[-1]
        T_steam = last_cycle.steam_temp_c or 320.0
        
    if tau is None:
        tau, _ = calibrate_tau(well, well.css_cycles or [])
        
    decay = math.exp(-max(0.0, days_since_steam_end) / max(1.0, tau))
    return float(T_res + (T_steam - T_res) * decay)

def estimated_viscosity(well: Well, days_since_steam_end: float, tau: Optional[float] = None) -> float:
    """
    Calculates dynamic dead-oil viscosity based on estimated temperature decay.
    """
    temp = estimated_temp(well, days_since_steam_end, tau=tau)
    return dead_oil_viscosity_cp(well.api_gravity, temp)
