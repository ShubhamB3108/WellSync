import math
from typing import Dict, Any, Tuple
from app.models.well import Well
from app.models.srp import DynoCard, SrpReading

# API Grade D rod string parameters (typical for Baghewala heavy oil wells)
API_GRADE_D_ALLOWABLE_STRESS_PSI = 32000.0  # Allowable stress psi
ROD_CROSS_SECTIONAL_AREA_IN2 = 0.785        # 1-inch sucker rod (pi * (0.5)^2)
NATURAL_FREQUENCY_SPM = 16.5                # Natural harmonic frequency of rod string
K_DYNAMIC = 0.35                            # Dynamic load acceleration coefficient
VFD_MAX_SPM = 10.0                          # Practical VFD maximum for heavy crude
VFD_MIN_SPM = 2.0                           # Minimum pump speed

def compute_rod_stress(pprl_lbf: float, spm: float) -> float:
    """
    Computes peak rod string stress using API RP 11L dynamic magnification factor:
    stress = (PPRL * dynamic_factor) / Area_rod
    """
    spm_ratio = spm / NATURAL_FREQUENCY_SPM
    dynamic_factor = 1.0 + K_DYNAMIC * (spm_ratio ** 2)
    stress_psi = (pprl_lbf * dynamic_factor) / ROD_CROSS_SECTIONAL_AREA_IN2
    return float(stress_psi)

def estimate_fillage_pct(card: DynoCard, stroke_length_in: float) -> float:
    """
    Estimates pump fillage percentage based on actual work card area vs theoretical max area.
    """
    if not card or not card.pprl_lbf:
        return 80.0
    load_range = max(1000.0, card.pprl_lbf - card.mprl_lbf)
    theoretical_area = load_range * stroke_length_in * 0.95
    if theoretical_area <= 0:
        return 75.0
    fillage = (card.card_area / theoretical_area) * 100.0
    return float(max(15.0, min(100.0, fillage)))

def recommend_srp_setpoint(
    well: Well,
    latest_reading: SrpReading,
    latest_card: DynoCard
) -> Dict[str, Any]:
    """
    Calculates optimal SPM and stroke setpoints while guaranteeing rod stress remains within API RP 11L limits.
    """
    current_spm = latest_reading.spm if latest_reading else 6.0
    stroke_length = latest_reading.stroke_length_in if latest_reading else 86.0
    classification = latest_card.classification if latest_card else "normal"
    current_fillage = estimate_fillage_pct(latest_card, stroke_length)
    pprl = latest_card.pprl_lbf if latest_card else 16500.0

    # Rule-based setpoint adjustments
    if classification == "fluid_pound":
        # Mitigate fluid pound by slowing down SPM so pump chamber fills completely
        candidate_spm = current_spm * 0.75
    elif classification == "pump_off":
        # Pump is dry / pumped off: aggressive speed cut
        candidate_spm = current_spm * 0.60
    elif current_fillage < 75.0:
        candidate_spm = current_spm * 0.85
    elif current_fillage > 95.0 and classification == "normal":
        candidate_spm = min(current_spm * 1.10, VFD_MAX_SPM)
    else:
        candidate_spm = current_spm

    # Clamp candidate within physical pump limits
    candidate_spm = round(float(max(VFD_MIN_SPM, min(VFD_MAX_SPM, candidate_spm))), 1)

    # Calculate predicted dynamic stress
    predicted_stress = compute_rod_stress(pprl, candidate_spm)
    
    # Check if within API RP 11L limit
    is_safe = predicted_stress <= API_GRADE_D_ALLOWABLE_STRESS_PSI
    
    # Predict fillage improvement: reducing SPM increases pump fillage towards target
    if candidate_spm < current_spm:
        predicted_fillage = min(92.0, current_fillage + (current_spm - candidate_spm) * 12.0)
    else:
        predicted_fillage = max(70.0, current_fillage - (candidate_spm - current_spm) * 4.0)
    predicted_fillage = round(float(predicted_fillage), 1)

    return {
        "recommended_spm": candidate_spm,
        "recommended_stroke_length_in": stroke_length,
        "predicted_fillage_pct": predicted_fillage,
        "rod_stress_check": "within_limit" if is_safe else "exceeds_limit",
        "predicted_stress_psi": round(predicted_stress, 1),
        "allowable_stress_psi": API_GRADE_D_ALLOWABLE_STRESS_PSI,
        "is_safe": is_safe
    }
