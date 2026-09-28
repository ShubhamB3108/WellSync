from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class AlertResponse(BaseModel):
    id: str
    well_id: str
    well_name: Optional[str] = None
    alert_type: str  # fluid_pound, high_risk, sor_trending_up, pump_off
    severity: str    # info, warning, critical
    message: str
    created_at: datetime
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class AlertListResponse(BaseModel):
    items: List[AlertResponse]
    total: int
    page: int
    page_size: int
