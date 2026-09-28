import json
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import require_role
from app.models.user import User
from app.models.well import Well
from app.models.css_cycle import CssCycle
from app.models.optimization import OptimizationRun
from app.schemas.css import CssOptimizeRequest, CssOptimizeResponse, CssPlanRequest, CssCycleResponse
from app.services.css_optimizer import optimize_css_parameters

router = APIRouter(prefix="/css", tags=["css"])

@router.post("/optimize/{well_id}", response_model=CssOptimizeResponse)
def optimize_css(
    well_id: str,
    request: CssOptimizeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("reservoir_engineer", "admin"))
):
    well = db.query(Well).filter(Well.id == well_id).first()
    if not well:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "WELL_NOT_FOUND", "message": f"Well with id '{well_id}' was not found"}
        )
        
    result = optimize_css_parameters(
        well=well,
        steam_volume_range=request.steam_volume_m3_range,
        soak_time_hours_range=request.soak_time_hours_range,
        min_recovery_bbl=request.min_recovery_bbl
    )
    
    if not result["candidates"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "NO_FEASIBLE_CANDIDATE", "message": result.get("warning") or "No parameter combination in range meets the minimum recovery target."}
        )
        
    # Record optimization run
    top_candidate = result["candidates"][0]
    opt_run = OptimizationRun(
        well_id=well.id,
        run_type="css",
        requested_by=current_user.id,
        input_params_json=json.dumps(request.model_dump()),
        recommended_params_json=json.dumps(top_candidate),
        predicted_metrics_json=json.dumps({
            "predicted_sor": top_candidate["predicted_sor"],
            "cumulative_oil_bbl": top_candidate["predicted_cumulative_oil_bbl"],
            "forecast_confidence": result["forecast_confidence"]
        }),
        status="pending"
    )
    db.add(opt_run)
    db.commit()
    
    return CssOptimizeResponse(
        candidates=result["candidates"],
        forecast_confidence=result["forecast_confidence"],
        warning=result.get("warning")
    )

@router.post("/cycles/{well_id}/plan", response_model=CssCycleResponse, status_code=status.HTTP_201_CREATED)
def plan_css_cycle(
    well_id: str,
    request: CssPlanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("reservoir_engineer", "admin"))
):
    well = db.query(Well).filter(Well.id == well_id).first()
    if not well:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "WELL_NOT_FOUND", "message": "Well not found"}
        )
        
    last_cycle = sorted(well.css_cycles or [], key=lambda c: c.cycle_number)[-1] if well.css_cycles else None
    next_cycle_num = (last_cycle.cycle_number + 1) if last_cycle else 1
    
    now = datetime.now(timezone.utc)
    injection_start = now + timedelta(days=2)
    injection_end = injection_start + timedelta(days=5)
    
    cycle = CssCycle(
        well_id=well.id,
        cycle_number=next_cycle_num,
        steam_volume_m3=request.steam_volume_m3,
        soak_time_hours=request.soak_time_hours,
        injection_pressure_kpa=request.injection_pressure_kpa or 12500.0,
        steam_temp_c=request.steam_temp_c or 320.0,
        injection_start=injection_start,
        injection_end=injection_end,
        status="planned",
        is_ai_recommended=request.is_ai_recommended,
        approved_by=current_user.id,
        approved_at=now
    )
    db.add(cycle)
    db.commit()
    db.refresh(cycle)
    
    return cycle
