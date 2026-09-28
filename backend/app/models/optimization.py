import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class OptimizationRun(Base):
    __tablename__ = "optimization_runs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    well_id = Column(String(36), ForeignKey("wells.id", ondelete="RESTRICT"), nullable=False, index=True)
    run_type = Column(String(50), nullable=False)  # css, srp
    requested_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    requested_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    input_params_json = Column(Text, nullable=False)
    recommended_params_json = Column(Text, nullable=False)
    predicted_metrics_json = Column(Text, nullable=False)
    status = Column(String(50), default="pending", nullable=False)  # pending, approved, rejected
    decided_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    decided_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    well = relationship("Well", back_populates="optimization_runs")
    requester = relationship("User", foreign_keys=[requested_by])
    decider = relationship("User", foreign_keys=[decided_by])
