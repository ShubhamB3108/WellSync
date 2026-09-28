import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class SrpReading(Base):
    __tablename__ = "srp_readings"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    well_id = Column(String(36), ForeignKey("wells.id", ondelete="RESTRICT"), nullable=False, index=True)
    reading_time = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    spm = Column(Float, nullable=False)
    stroke_length_in = Column(Float, nullable=False)
    vfd_frequency_hz = Column(Float, nullable=True)
    polished_rod_load_lbf = Column(Float, nullable=True)
    motor_current_a = Column(Float, nullable=True)
    estimated_fluid_level_m = Column(Float, nullable=True)
    
    well = relationship("Well", back_populates="srp_readings")

class DynoCard(Base):
    __tablename__ = "dyno_cards"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    well_id = Column(String(36), ForeignKey("wells.id", ondelete="RESTRICT"), nullable=False, index=True)
    card_time = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    load_position_json = Column(Text, nullable=False)  # Serialized list of {position_in, load_lbf}
    pprl_lbf = Column(Float, nullable=False)
    mprl_lbf = Column(Float, nullable=False)
    card_area = Column(Float, nullable=False)
    classification = Column(String(50), nullable=True)  # normal, fluid_pound, gas_interference, pump_off, worn_valve, uncertain
    classification_confidence = Column(Float, nullable=True)
    is_synthetic = Column(Boolean, default=True, nullable=False)
    
    well = relationship("Well", back_populates="dyno_cards")
