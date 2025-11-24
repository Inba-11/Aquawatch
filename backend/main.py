import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .db import init_db
from . import crud
from .schemas import SensorReading, SensorReadingCreate, HistoryPoint

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="AquaWatch Backend")


@app.on_event("startup")
async def on_startup() -> None:
    logger.info("Initializing database...")
    init_db()
    logger.info("Database initialized successfully")


# Allow frontend on various ports
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    # Add more ports if needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> dict:
    """Root endpoint - API information"""
    return {
        "name": "AquaWatch Backend API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/ping",
            "latest": "/latest",
            "history": "/history?period=1day|1month|6months",
            "create_sensor": "POST /sensor",
            "docs": "/docs"
        }
    }


@app.get("/ping")
async def ping() -> dict:
    """Health check endpoint"""
    return {"status": "ok"}


@app.get("/latest", response_model=SensorReading)
async def latest() -> SensorReading:
    """Get the latest sensor reading"""
    try:
        reading = crud.get_latest_sensor_reading()
        if not reading:
            raise HTTPException(
                status_code=404, 
                detail="No sensor data available. Please ensure the Arduino worker is running and sending data."
            )
        logger.debug(f"Retrieved latest reading: {reading.id}")
        return reading
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching latest reading: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/history", response_model=list[HistoryPoint])
async def history(period: str) -> list[HistoryPoint]:
    """Get historical sensor data for a given period"""
    if period not in ["1day", "1month", "6months"]:
        raise HTTPException(status_code=400, detail="Invalid period. Use 1day, 1month, or 6months.")
    
    try:
        data = crud.get_history(period)
        logger.debug(f"Retrieved {len(data)} history points for period: {period}")
        return data
    except ValueError as e:
        logger.error(f"Invalid period value: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching history: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/sensor", response_model=SensorReading)
async def create_sensor(data: SensorReadingCreate) -> SensorReading:
    """Create a new sensor reading (used by Arduino worker)"""
    try:
        # Validate sensor data ranges
        if not (0 <= data.ph <= 14):
            raise HTTPException(status_code=400, detail="pH must be between 0 and 14")
        if data.tds < 0:
            raise HTTPException(status_code=400, detail="TDS must be non-negative")
        if data.turbidity < 0:
            raise HTTPException(status_code=400, detail="Turbidity must be non-negative")
        
        reading = crud.create_sensor_reading(data)
        logger.info(f"Created sensor reading: {reading.id} - pH: {reading.ph}, TDS: {reading.tds}, Turbidity: {reading.turbidity}")
        return reading
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating sensor reading: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
