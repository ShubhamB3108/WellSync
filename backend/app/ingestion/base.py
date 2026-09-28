from abc import ABC, abstractmethod
from typing import Dict, Any, List
from sqlalchemy.orm import Session

class IngestionSource(ABC):
    @abstractmethod
    def ingest_reading(self, db: Session, payload: Dict[str, Any]) -> Any:
        """Ingests a single reading (SRP telemetry or dyno card)."""
        pass

    @abstractmethod
    def get_source_name(self) -> str:
        """Returns readable name of this ingestion adapter."""
        pass
