import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.constants.enums import WasteType
from app.database.base import Base

if TYPE_CHECKING:
    from app.models.waste_generator import WasteGenerator


class Forecast(Base):
    """One XGBoost (or Random-Forest baseline) prediction, persisted so the
    Forecast page can show prediction history rather than only the last live
    call, and so /api/dashboard can chart historical vs predicted without
    re-running the model. Produced by ml/predict.py via forecast_service.py."""

    __tablename__ = "forecasts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    generator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("waste_generators.id", ondelete="CASCADE"), nullable=False, index=True
    )
    waste_type: Mapped[WasteType] = mapped_column(Enum(WasteType, name="waste_type", create_type=False), nullable=False)
    forecast_date: Mapped[date] = mapped_column(Date, nullable=False)
    predicted_quantity_tonnes: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    confidence: Mapped[float] = mapped_column(Numeric(4, 3), nullable=False)
    model_name: Mapped[str] = mapped_column(String(50), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    generator: Mapped["WasteGenerator"] = relationship(back_populates="forecasts")
