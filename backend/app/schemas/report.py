from typing import List, Dict, Any
from pydantic import BaseModel

class TrendPoint(BaseModel):
    date: str
    value: float

class FieldSummaryResponse(BaseModel):
    period_days: int
    current_sor: float
    target_sor: float
    current_energy_kwh_per_bbl: float
    target_energy_kwh_per_bbl: float
    active_wells_count: int
    high_risk_wells_count: int
    active_alerts_count: int
    sor_trend: List[TrendPoint]
    energy_per_bbl_trend: List[TrendPoint]
    rod_failure_trend: List[TrendPoint]
    wells_leaderboard: List[Dict[str, Any]]
