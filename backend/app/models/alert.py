import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    well_id = Column(String(36), ForeignKey("wells.id", ondelete="RESTRICT"), nullable=False, index=True)
    alert_type = Column(String(50), nullable=False)  # fluid_pound, high_risk, sor_trending_up, pump_off
    severity = Column(String(50), nullable=False)    # info, warning, critical
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    acknowledged_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    
    well = relationship("Well", back_populates="alerts")
    acknowledger = relationship("User", foreign_keys=[acknowledged_by])
