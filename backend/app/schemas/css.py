from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class CssOptimizeRequest(BaseModel):
    steam_volume_m3_range: List[float] = Field(..., min_length=2, max_length=2)  # [min, max]
    soak_time_hours_range: List[float] = Field(..., min_length=2, max_length=2)  # [min, max]
    min_recovery_bbl: float = 300.0

class PredictedSrpImpact(BaseModel):
    est_viscosity_at_start_cp: float
    recommended_initial_spm: float
    expected_fillage_pct: float

class CssCandidate(BaseModel):
    steam_volume_m3: float
    soak_time_hours: float
    predicted_sor: float
    predicted_cumulative_oil_bbl: float
    predicted_srp_impact: PredictedSrpImpact

class CssOptimizeResponse(BaseModel):
    candidates: List[CssCandidate]
    forecast_confidence: str
    warning: Optional[str] = None

class CssPlanRequest(BaseModel):
    steam_volume_m3: float
    soak_time_hours: float
    injection_pressure_kpa: Optional[float] = 12000.0
    steam_temp_c: Optional[float] = 320.0
    is_ai_recommended: bool = True

class CssCycleResponse(BaseModel):
    id: str
    well_id: str
    cycle_number: int
    steam_volume_m3: float
    soak_time_hours: float
    injection_pressure_kpa: float
    steam_temp_c: float
    status: str
    is_ai_recommended: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
