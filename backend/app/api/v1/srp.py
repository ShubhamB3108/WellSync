import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user, require_role
from app.models.user import User
from app.models.well import Well
from app.models.srp import DynoCard, SrpReading
from app.models.optimization import OptimizationRun
from app.schemas.srp import DynoCardResponse, DynoPoint, SrpOptimizeResponse
from app.services.srp_optimizer import recommend_srp_setpoint

router = APIRouter(prefix="/srp", tags=["srp"])

@router.get("/dyno-cards/{well_id}", response_model=List[DynoCardResponse])
def get_dyno_cards(
    well_id: str,
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cards = db.query(DynoCard).filter(DynoCard.well_id == well_id).order_by(DynoCard.card_time.desc()).limit(limit).all()
    results = []
    for c in cards:
        try:
            raw_pts = json.loads(c.load_position_json)
            pts = [DynoPoint(position_in=p["position_in"], load_lbf=p["load_lbf"]) for p in raw_pts]
        except Exception:
            pts = []
            
        results.append(DynoCardResponse(
            id=c.id,
            well_id=c.well_id,
            card_time=c.card_time,
            points=pts,
            pprl_lbf=c.pprl_lbf,
            mprl_lbf=c.mprl_lbf,
            card_area=c.card_area,
            classification=c.classification,
            classification_confidence=c.classification_confidence,
            is_synthetic=c.is_synthetic
        ))
    return results

@router.post("/optimize/{well_id}", response_model=SrpOptimizeResponse)
def optimize_srp(
    well_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("field_engineer", "admin"))
):
    well = db.query(Well).filter(Well.id == well_id).first()
    if not well:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "WELL_NOT_FOUND", "message": "Well not found"}
        )
        
    latest_reading = well.srp_readings[0] if well.srp_readings else None
    latest_card = well.dyno_cards[0] if well.dyno_cards else None
    
    if not latest_card:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "NO_CARDS_AVAILABLE", "message": "No dynamometer card available to compute recommendation"}
        )
        
    recommendation = recommend_srp_setpoint(well, latest_reading, latest_card)
    
    if not recommendation["is_safe"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "NO_SAFE_RECOMMENDATION",
                "message": "Recommended fillage target requires exceeding rod stress limit — flagged for mechanical review."
            }
        )
        
    # Save optimization run
    opt_run = OptimizationRun(
        well_id=well.id,
        run_type="srp",
        requested_by=current_user.id,
        input_params_json=json.dumps({
            "current_spm": latest_reading.spm if latest_reading else 6.0,
            "classification": latest_card.classification,
            "pprl_lbf": latest_card.pprl_lbf
        }),
        recommended_params_json=json.dumps({
            "recommended_spm": recommendation["recommended_spm"],
            "recommended_stroke_length_in": recommendation["recommended_stroke_length_in"]
        }),
        predicted_metrics_json=json.dumps({
            "predicted_fillage_pct": recommendation["predicted_fillage_pct"],
            "predicted_stress_psi": recommendation["predicted_stress_psi"],
            "rod_stress_check": recommendation["rod_stress_check"]
        }),
        status="pending"
    )
    db.add(opt_run)
    db.commit()
    db.refresh(opt_run)
    
    return SrpOptimizeResponse(
        recommended_spm=recommendation["recommended_spm"],
        recommended_stroke_length_in=recommendation["recommended_stroke_length_in"],
        predicted_fillage_pct=recommendation["predicted_fillage_pct"],
        rod_stress_check=recommendation["rod_stress_check"],
        predicted_stress_psi=recommendation["predicted_stress_psi"],
        allowable_stress_psi=recommendation["allowable_stress_psi"],
        optimization_run_id=opt_run.id,
        message="Recommendation computed successfully. Human approval required before logging as applied."
    )
