from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict

class WellSummary(BaseModel):
    id: str
    name: str
    field_name: str
    reservoir_formation: str
    api_gravity: float
    reservoir_temp_c: float
    status: str
    current_alert_level: str  # normal, warning, critical
    rod_failure_risk_band: Optional[str] = "low"
    latest_classification: Optional[str] = "normal"

    model_config = ConfigDict(from_attributes=True)

class WellListResponse(BaseModel):
    items: List[WellSummary]
    total: int
    page: int
    page_size: int

class ReservoirState(BaseModel):
    estimated_temp_c: float
    days_since_last_steam: float
    estimated_viscosity_cp: float
    forecast_confidence: str  # in_range, field_default, extrapolated

class CurrentCycleState(BaseModel):
    id: str
    cycle_number: int
    status: str
    steam_volume_m3: float
    soak_time_hours: float
    cumulative_oil_bbl: Optional[float] = None

class SrpState(BaseModel):
    latest_card_id: Optional[str] = None
    classification: Optional[str] = None
    classification_confidence: Optional[float] = None
    estimated_fillage_pct: float
    current_spm: float
    stroke_length_in: float
    vfd_frequency_hz: Optional[float] = None

class RodFailureRiskState(BaseModel):
    score: float
    band: str  # low, medium, high
    factors: List[str] = []

class DigitalTwinStateResponse(BaseModel):
    well_id: str
    well_name: str
    api_gravity: float
    reservoir_temp_baseline_c: float
    computed_at: datetime
    reservoir: ReservoirState
    current_cycle: Optional[CurrentCycleState] = None
    srp: SrpState
    rod_failure_risk: RodFailureRiskState
    pending_recommendations: List[Dict[str, Any]] = []
