from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class DynoPoint(BaseModel):
    position_in: float
    load_lbf: float

class DynoCardResponse(BaseModel):
    id: str
    well_id: str
    card_time: datetime
    points: List[DynoPoint]
    pprl_lbf: float
    mprl_lbf: float
    card_area: float
    classification: Optional[str] = None
    classification_confidence: Optional[float] = None
    is_synthetic: bool = True

class SrpOptimizeRequest(BaseModel):
    pass  # Uses latest ingested state

class SrpOptimizeResponse(BaseModel):
    recommended_spm: float
    recommended_stroke_length_in: float
    predicted_fillage_pct: float
    rod_stress_check: str  # within_limit or exceeds_limit
    predicted_stress_psi: float
    allowable_stress_psi: float
    optimization_run_id: str
    message: Optional[str] = None
