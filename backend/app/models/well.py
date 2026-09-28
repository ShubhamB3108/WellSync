import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

class Well(Base):
    __tablename__ = "wells"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), unique=True, nullable=False, index=True)
    field_name = Column(String(100), default="Baghewala", nullable=False)
    reservoir_formation = Column(String(100), default="Jodhpur Sandstone", nullable=False)
    api_gravity = Column(Float, nullable=False)  # 17-19 typical
    reservoir_temp_c = Column(Float, nullable=False)  # 46-48 typical
    reservoir_pressure_kpa = Column(Float, nullable=True)
    productivity_index = Column(Float, nullable=True)
    status = Column(String(50), default="active", nullable=False)  # active, shut_in, workover
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    fluid_properties = relationship("FluidProperty", back_populates="well", cascade="all, delete-orphan")
    css_cycles = relationship("CssCycle", back_populates="well", cascade="all, delete-orphan", order_by="CssCycle.cycle_number")
    srp_readings = relationship("SrpReading", back_populates="well", cascade="all, delete-orphan", order_by="desc(SrpReading.reading_time)")
    dyno_cards = relationship("DynoCard", back_populates="well", cascade="all, delete-orphan", order_by="desc(DynoCard.card_time)")
    rod_failures = relationship("RodFailure", back_populates="well", cascade="all, delete-orphan", order_by="desc(RodFailure.failure_time)")
    optimization_runs = relationship("OptimizationRun", back_populates="well", cascade="all, delete-orphan", order_by="desc(OptimizationRun.requested_at)")
    alerts = relationship("Alert", back_populates="well", cascade="all, delete-orphan", order_by="desc(Alert.created_at)")
