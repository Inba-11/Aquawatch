from datetime import datetime

from pydantic import BaseModel


class SensorReading(BaseModel):
    id: int
    timestamp: datetime
    ph: float
    tds: float
    turbidity: float


class SensorReadingCreate(BaseModel):
    ph: float
    tds: float
    turbidity: float


class HistoryPoint(BaseModel):
    time: datetime
    ph: float
    tds: float
    turbidity: float
