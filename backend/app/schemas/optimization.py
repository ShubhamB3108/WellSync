from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel

class OptimizationRunResponse(BaseModel):
    id: str
    well_id: str
    run_type: str  # css, srp
    requested_by: Optional[str] = None
    requested_at: datetime
    input_params: Dict[str, Any]
    recommended_params: Dict[str, Any]
    predicted_metrics: Dict[str, Any]
    status: str  # pending, approved, rejected
    decided_by: Optional[str] = None
    decided_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None

class RejectRequest(BaseModel):
    reason: Optional[str] = None
