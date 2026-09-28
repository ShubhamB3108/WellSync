import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class FluidProperty(Base):
    __tablename__ = "fluid_properties"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    well_id = Column(String(36), ForeignKey("wells.id", ondelete="RESTRICT"), nullable=False, index=True)
    measured_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    dead_oil_viscosity_cp = Column(Float, nullable=True)
    reference_temp_c = Column(Float, nullable=True)
    asphaltene_pct = Column(Float, nullable=True)
    source = Column(String(50), default="estimated", nullable=False)  # lab, estimated
    
    well = relationship("Well", back_populates="fluid_properties")
