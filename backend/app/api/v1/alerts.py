from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.models.alert import Alert
from app.schemas.alert import AlertListResponse, AlertResponse

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.get("", response_model=AlertListResponse)
def list_alerts(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    severity: Optional[str] = None,
    acknowledged: Optional[bool] = None,
    well_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Alert)
    if severity:
        query = query.filter(Alert.severity == severity)
    if acknowledged is True:
        query = query.filter(Alert.acknowledged_at != None)
    elif acknowledged is False:
        query = query.filter(Alert.acknowledged_at == None)
    if well_id:
        query = query.filter(Alert.well_id == well_id)
        
    total = query.count()
    alerts = query.order_by(Alert.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    items = []
    for a in alerts:
        items.append(AlertResponse(
            id=a.id,
            well_id=a.well_id,
            well_name=a.well.name if a.well else None,
            alert_type=a.alert_type,
            severity=a.severity,
            message=a.message,
            created_at=a.created_at,
            acknowledged_by=a.acknowledged_by,
            acknowledged_at=a.acknowledged_at
        ))
        
    return AlertListResponse(items=items, total=total, page=page, page_size=page_size)

@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
def acknowledge_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ALERT_NOT_FOUND", "message": "Alert not found"}
        )
        
    alert.acknowledged_by = current_user.id
    alert.acknowledged_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(alert)
    
    return AlertResponse(
        id=alert.id,
        well_id=alert.well_id,
        well_name=alert.well.name if alert.well else None,
        alert_type=alert.alert_type,
        severity=alert.severity,
        message=alert.message,
        created_at=alert.created_at,
        acknowledged_by=alert.acknowledged_by,
        acknowledged_at=alert.acknowledged_at
    )
