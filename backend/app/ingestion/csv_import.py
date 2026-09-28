import csv
import io
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from app.models.well import Well
from app.models.srp import SrpReading, DynoCard
from app.ingestion.simulator import generate_dyno_card_points
from app.services.dyno_classifier import classify_dyno_card

def process_historian_csv(db: Session, csv_content: str) -> Dict[str, Any]:
    """
    Parses and ingests a historian CSV file into the database through the identical
    WellService/ingestion pipeline.
    Expected headers:
    well_name,reading_time,spm,stroke_length_in,vfd_frequency_hz,pprl_lbf,mprl_lbf,classification
    """
    reader = csv.DictReader(io.StringIO(csv_content))
    required_cols = {"well_name", "reading_time", "spm", "stroke_length_in"}
    if not required_cols.issubset(set(reader.fieldnames or [])):
        missing = list(required_cols - set(reader.fieldnames or []))
        return {
            "success": False,
            "error_code": "CSV_SCHEMA_INVALID",
            "message": f"CSV is missing required headers: {', '.join(missing)}"
        }
        
    imported_count = 0
    errors = []
    
    for row_idx, row in enumerate(reader, start=2):
        try:
            w_name = row["well_name"].strip()
            well = db.query(Well).filter(Well.name == w_name).first()
            if not well:
                well = Well(
                    name=w_name,
                    field_name="Baghewala",
                    reservoir_formation="Jodhpur Sandstone",
                    api_gravity=18.0,
                    reservoir_temp_c=47.0,
                    status="active"
                )
                db.add(well)
                db.flush()
                
            reading_time_str = row["reading_time"].strip()
            try:
                reading_time = datetime.fromisoformat(reading_time_str)
                if reading_time.tzinfo is None:
                    reading_time = reading_time.replace(tzinfo=timezone.utc)
            except Exception:
                reading_time = datetime.now(timezone.utc)
                
            spm = float(row["spm"])
            stroke_length = float(row["stroke_length_in"])
            vfd_hz = float(row.get("vfd_frequency_hz", spm * 8.0) or (spm * 8.0))
            pprl = float(row.get("pprl_lbf", 16500.0) or 16500.0)
            mprl = float(row.get("mprl_lbf", 4500.0) or 4500.0)
            card_class = row.get("classification", "normal").strip().lower()
            
            # Create SRP reading
            reading = SrpReading(
                well_id=well.id,
                reading_time=reading_time,
                spm=spm,
                stroke_length_in=stroke_length,
                vfd_frequency_hz=vfd_hz,
                polished_rod_load_lbf=pprl
            )
            db.add(reading)
            
            # Generate and classify dyno card
            points = generate_dyno_card_points(
                card_type=card_class,
                stroke_length_in=stroke_length,
                pprl_lbf=pprl,
                mprl_lbf=mprl
            )
            pred_class, conf, feats = classify_dyno_card(points)
            
            card = DynoCard(
                well_id=well.id,
                card_time=reading_time,
                load_position_json=json.dumps(points),
                pprl_lbf=feats["pprl_lbf"],
                mprl_lbf=feats["mprl_lbf"],
                card_area=feats["card_area"],
                classification=card_class if card_class in ["fluid_pound", "pump_off", "gas_interference"] else pred_class,
                classification_confidence=conf,
                is_synthetic=False
            )
            db.add(card)
            imported_count += 1
            
        except Exception as e:
            errors.append(f"Row {row_idx}: {str(e)}")
            if len(errors) > 10:
                break
                
    if errors and imported_count == 0:
        return {
            "success": False,
            "error_code": "CSV_SCHEMA_INVALID",
            "message": errors[0]
        }
        
    db.commit()
    return {
        "success": True,
        "imported_rows": imported_count,
        "warnings": errors
    }
