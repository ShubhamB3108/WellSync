import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.models.optimization import OptimizationRun
from app.models.srp import SrpReading
from app.models.alert import Alert
from app.schemas.optimization import OptimizationRunResponse, RejectRequest

router = APIRouter(prefix="/optimization-runs", tags=["optimization"])

@router.post("/{run_id}/approve", response_model=OptimizationRunResponse)
def approve_recommendation(
    run_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    run = db.query(OptimizationRun).filter(OptimizationRun.id == run_id).first()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RUN_NOT_FOUND", "message": "Optimization run not found"}
        )
    if run.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "ALREADY_DECIDED", "message": f"Run has already been {run.status}"}
        )
        
    # Check domain role
    if current_user.role != "admin":
        if run.run_type == "css" and current_user.role != "reservoir_engineer":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"code": "FORBIDDEN", "message": "Only reservoir engineers or admins can approve CSS plans"})
        if run.run_type == "srp" and current_user.role != "field_engineer":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"code": "FORBIDDEN", "message": "Only field engineers or admins can approve SRP setpoints"})
            
    now = datetime.now(timezone.utc)
    run.status = "approved"
    run.decided_by = current_user.id
    run.decided_at = now
    
    # If SRP recommendation, apply the approved SPM setpoint to latest well state
    if run.run_type == "srp":
        try:
            rec_params = json.loads(run.recommended_params_json)
            new_spm = rec_params.get("recommended_spm")
            if new_spm:
                new_reading = SrpReading(
                    well_id=run.well_id,
                    reading_time=now,
                    spm=float(new_spm),
                    stroke_length_in=float(rec_params.get("recommended_stroke_length_in", 86.0)),
                    vfd_frequency_hz=float(new_spm) * 8.0,
                    polished_rod_load_lbf=15200.0,
                    motor_current_a=21.0,
                    estimated_fluid_level_m=350.0
                )
                db.add(new_reading)
                
                # Auto-acknowledge active fluid pound alerts for this well since mitigation was approved
                active_alerts = db.query(Alert).filter(
                    Alert.well_id == run.well_id,
                    Alert.alert_type == "fluid_pound",
                    Alert.acknowledged_at == None
                ).all()
                for a in active_alerts:
                    a.acknowledged_at = now
        except Exception as e:
            print(f"Error applying approved SRP setpoint: {e}")
            
    db.commit()
    db.refresh(run)
    
    return OptimizationRunResponse(
        id=run.id,
        well_id=run.well_id,
        run_type=run.run_type,
        requested_by=run.requested_by,
        requested_at=run.requested_at,
        input_params=json.loads(run.input_params_json or "{}"),
        recommended_params=json.loads(run.recommended_params_json or "{}"),
        predicted_metrics=json.loads(run.predicted_metrics_json or "{}"),
        status=run.status,
        decided_by=run.decided_by,
        decided_at=run.decided_at,
        rejection_reason=run.rejection_reason
    )

@router.post("/{run_id}/reject", response_model=OptimizationRunResponse)
def reject_recommendation(
    run_id: str,
    request: RejectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    run = db.query(OptimizationRun).filter(OptimizationRun.id == run_id).first()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RUN_NOT_FOUND", "message": "Optimization run not found"}
        )
    if run.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "ALREADY_DECIDED", "message": f"Run has already been {run.status}"}
        )
        
    now = datetime.now(timezone.utc)
    run.status = "rejected"
    run.decided_by = current_user.id
    run.decided_at = now
    run.rejection_reason = request.reason
    
    db.commit()
    db.refresh(run)
    
    return OptimizationRunResponse(
        id=run.id,
        well_id=run.well_id,
        run_type=run.run_type,
        requested_by=run.requested_by,
        requested_at=run.requested_at,
        input_params=json.loads(run.input_params_json or "{}"),
        recommended_params=json.loads(run.recommended_params_json or "{}"),
        predicted_metrics=json.loads(run.predicted_metrics_json or "{}"),
        status=run.status,
        decided_by=run.decided_by,
        decided_at=run.decided_at,
        rejection_reason=run.rejection_reason
    )
