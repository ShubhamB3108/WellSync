from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.models.well import Well
from app.models.alert import Alert
from app.schemas.well import WellListResponse, WellSummary, DigitalTwinStateResponse
from app.services.digital_twin_state import get_digital_twin_state
from app.services.rod_failure_risk import calculate_rod_failure_risk

router = APIRouter(prefix="/wells", tags=["wells"])

@router.get("", response_model=WellListResponse)
def list_wells(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Well)
    if status_filter:
        query = query.filter(Well.status == status_filter)
        
    total = query.count()
    wells = query.order_by(Well.name).offset((page - 1) * page_size).limit(page_size).all()
    
    items = []
    for w in wells:
        # Determine highest severity of unacknowledged alerts
        crit_alert = db.query(Alert).filter(Alert.well_id == w.id, Alert.severity == "critical", Alert.acknowledged_at == None).first()
        warn_alert = db.query(Alert).filter(Alert.well_id == w.id, Alert.severity == "warning", Alert.acknowledged_at == None).first()
        if crit_alert:
            alert_lvl = "critical"
        elif warn_alert:
            alert_lvl = "warning"
        else:
            alert_lvl = "normal"
            
        risk = calculate_rod_failure_risk(w)
        latest_card = w.dyno_cards[0] if w.dyno_cards else None
        latest_class = latest_card.classification if latest_card else "normal"
        
        items.append(WellSummary(
            id=w.id,
            name=w.name,
            field_name=w.field_name,
            reservoir_formation=w.reservoir_formation,
            api_gravity=w.api_gravity,
            reservoir_temp_c=w.reservoir_temp_c,
            status=w.status,
            current_alert_level=alert_lvl,
            rod_failure_risk_band=risk["band"],
            latest_classification=latest_class
        ))
        
    return WellListResponse(items=items, total=total, page=page, page_size=page_size)

@router.get("/{well_id}/state", response_model=DigitalTwinStateResponse)
def get_well_digital_twin_state(
    well_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    well = db.query(Well).filter(Well.id == well_id).first()
    if not well:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "WELL_NOT_FOUND", "message": f"Well with id '{well_id}' was not found"}
        )
    return get_digital_twin_state(db, well)
