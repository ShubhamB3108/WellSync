from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash
from app.api.v1.auth import require_role
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse
from app.ingestion.csv_import import process_historian_csv

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    return db.query(User).order_by(User.created_at.desc()).all()

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    request: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "EMAIL_EXISTS", "message": f"User with email '{request.email}' already exists"}
        )
        
    user = User(
        email=request.email,
        password_hash=get_password_hash(request.password),
        full_name=request.full_name,
        role=request.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/ingestion/source")
async def switch_or_upload_ingestion_source(
    source_type: str = Form("simulator"),
    csv_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    if source_type == "csv_import":
        if not csv_file:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "FILE_REQUIRED", "message": "CSV file must be uploaded when source_type is 'csv_import'"}
            )
        content = await csv_file.read()
        try:
            csv_text = content.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "ENCODING_ERROR", "message": "Uploaded file is not valid UTF-8 text"}
            )
            
        result = process_historian_csv(db, csv_text)
        if not result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": result.get("error_code", "CSV_SCHEMA_INVALID"), "message": result.get("message")}
            )
            
        return {
            "message": f"Successfully imported {result['imported_rows']} readings from CSV.",
            "active_source": "csv_import",
            "imported_rows": result["imported_rows"],
            "warnings": result["warnings"]
        }
    else:
        return {
            "message": "Active ingestion source switched to Simulated Field Data.",
            "active_source": "simulator"
        }
