import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class CssCycle(Base):
    __tablename__ = "css_cycles"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    well_id = Column(String(36), ForeignKey("wells.id", ondelete="RESTRICT"), nullable=False, index=True)
    cycle_number = Column(Integer, nullable=False)
    steam_volume_m3 = Column(Float, nullable=False)
    injection_pressure_kpa = Column(Float, nullable=False)
    steam_temp_c = Column(Float, nullable=False)
    soak_time_hours = Column(Float, nullable=False)
    injection_start = Column(DateTime(timezone=True), nullable=False)
    injection_end = Column(DateTime(timezone=True), nullable=False)
    production_start = Column(DateTime(timezone=True), nullable=True)
    production_cutoff = Column(DateTime(timezone=True), nullable=True)
    cumulative_oil_bbl = Column(Float, nullable=True)
    status = Column(String(50), default="planned", nullable=False)  # planned, injecting, soaking, producing, completed
    is_ai_recommended = Column(Boolean, default=False, nullable=False)
    approved_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    
    well = relationship("Well", back_populates="css_cycles")
    approver = relationship("User", foreign_keys=[approved_by])
