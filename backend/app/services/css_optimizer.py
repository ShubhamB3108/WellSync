import math
from typing import List, Dict, Any, Tuple
import numpy as np
from app.models.well import Well
from app.services.reservoir_model import calibrate_tau, estimated_viscosity, dead_oil_viscosity_cp

def simulate_cycle_production(
    well: Well,
    steam_volume_m3: float,
    soak_time_hours: float,
    tau: float,
    production_days: int = 120
) -> Tuple[float, float, float]:
    """
    Simulates production across cycle production period.
    Thermal drawdown drives oil rate:
    q(t) = PI * DeltaP / mu(t)
    Returns: (cumulative_oil_bbl, sor, initial_viscosity_cp)
    """
    # Baseline productivity index for Baghewala sandstone
    pi = well.productivity_index or 0.08  # bbl/day/psi/cP
    drawdown_psi = 450.0  # typical pressure drawdown
    
    # Steam heat penetration scales with steam volume and soak time
    soak_eff = min(1.0, soak_time_hours / 72.0)
    steam_temp = min(330.0, 200.0 + (steam_volume_m3 / 400.0) * 120.0)
    
    # Initial viscosity right after soak period (t = 0 of production)
    initial_temp = well.reservoir_temp_c + (steam_temp - well.reservoir_temp_c) * soak_eff
    initial_viscosity = dead_oil_viscosity_cp(well.api_gravity, initial_temp)
    
    # Numerical daily integration over cycle production
    daily_rates = []
    economic_limit_bopd = 3.0
    
    for day in range(production_days):
        t_eff = day + (soak_time_hours / 24.0)
        temp_t = well.reservoir_temp_c + (steam_temp - well.reservoir_temp_c) * math.exp(-t_eff / max(10.0, tau))
        visc_t = dead_oil_viscosity_cp(well.api_gravity, temp_t)
        
        # Inflow equation: q = (PI * drawdown) / (visc / 100)
        rate = (pi * drawdown_psi * 15.0) / max(1.0, (visc_t ** 0.65))
        if rate < economic_limit_bopd and day > 30:
            break
        daily_rates.append(rate)
        
    cum_oil_bbl = float(sum(daily_rates))
    sor = float(steam_volume_m3 / max(1.0, cum_oil_bbl))
    
    return cum_oil_bbl, sor, initial_viscosity

def optimize_css_parameters(
    well: Well,
    steam_volume_range: List[float],
    soak_time_hours_range: List[float],
    min_recovery_bbl: float = 300.0,
    n_samples: int = 150
) -> Dict[str, Any]:
    """
    Runs response surface search over candidate steam volumes and soak times.
    Couples thermal cycle design directly to initial SRP setpoint recommendations.
    """
    tau, conf = calibrate_tau(well, well.css_cycles or [])
    
    vol_min, vol_max = min(steam_volume_range), max(steam_volume_range)
    soak_min, soak_max = min(soak_time_hours_range), max(soak_time_hours_range)
    
    # Grid sampling
    vols = np.linspace(vol_min, vol_max, int(np.sqrt(n_samples)))
    soaks = np.linspace(soak_min, soak_max, int(np.sqrt(n_samples)))
    
    candidates = []
    
    for v in vols:
        for s in soaks:
            cum_oil, sor, init_visc = simulate_cycle_production(well, v, s, tau)
            if cum_oil < min_recovery_bbl:
                continue
                
            # Coupled SRP recommendation based on initial viscosity:
            # Lower viscosity allows higher initial SPM (e.g. 5.5-6.5 SPM), higher viscosity needs lower SPM (3.5-4.5)
            if init_visc < 500:
                rec_spm = 6.2
                exp_fillage = 92.0
            elif init_visc < 1500:
                rec_spm = 5.2
                exp_fillage = 88.0
            elif init_visc < 3000:
                rec_spm = 4.4
                exp_fillage = 84.0
            else:
                rec_spm = 3.6
                exp_fillage = 78.0
                
            candidates.append({
                "steam_volume_m3": round(float(v), 1),
                "soak_time_hours": round(float(s), 1),
                "predicted_sor": round(float(sor), 2),
                "predicted_cumulative_oil_bbl": round(float(cum_oil), 1),
                "predicted_srp_impact": {
                    "est_viscosity_at_start_cp": round(float(init_visc), 1),
                    "recommended_initial_spm": round(float(rec_spm), 1),
                    "expected_fillage_pct": round(float(exp_fillage), 1)
                }
            })
            
    if not candidates:
        return {
            "candidates": [],
            "forecast_confidence": conf,
            "warning": "No candidate combination met the minimum cumulative recovery threshold. Try widening the parameter search bounds."
        }
        
    # Sort candidates ascending by SOR (Steam-Oil Ratio: lower is more efficient)
    candidates.sort(key=lambda c: c["predicted_sor"])
    top_candidates = candidates[:5]
    
    warning = None
    if conf == "field_default":
        warning = "Well has < 3 completed historical cycles. Calibrated against field-average parameters."
        
    return {
        "candidates": top_candidates,
        "forecast_confidence": conf,
        "warning": warning
    }
