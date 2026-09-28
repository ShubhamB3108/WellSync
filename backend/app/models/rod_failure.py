import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class RodFailure(Base):
    __tablename__ = "rod_failures"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    well_id = Column(String(36), ForeignKey("wells.id", ondelete="RESTRICT"), nullable=False, index=True)
    failure_time = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    failure_type = Column(String(50), nullable=False)  # fatigue, buckling, coupling, other
    depth_ft = Column(Float, nullable=True)
    downtime_hours = Column(Float, nullable=True)
    is_synthetic = Column(Boolean, default=True, nullable=False)
    
    well = relationship("Well", back_populates="rod_failures")
