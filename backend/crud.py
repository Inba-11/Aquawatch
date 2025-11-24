import logging
from datetime import datetime, timedelta
from typing import List, Optional

from .db import get_connection
from .schemas import SensorReading, SensorReadingCreate, HistoryPoint

logger = logging.getLogger(__name__)


def create_sensor_reading(data: SensorReadingCreate) -> SensorReading:
    """Create a new sensor reading in the database"""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO sensor_data (ph, tds, turbidity) VALUES (?, ?, ?)",
            (data.ph, data.tds, data.turbidity),
        )
        conn.commit()
        row_id = cur.lastrowid
        cur.execute("SELECT id, timestamp, ph, tds, turbidity FROM sensor_data WHERE id = ?", (row_id,))
        row = cur.fetchone()
        if not row:
            raise ValueError("Failed to retrieve created sensor reading")
        # Convert row to dict and parse timestamp
        row_dict = dict(row)
        # Parse timestamp string to datetime if it's a string
        if isinstance(row_dict['timestamp'], str):
            row_dict['timestamp'] = datetime.fromisoformat(row_dict['timestamp'].replace('Z', '+00:00'))
        return SensorReading(**row_dict)
    except Exception as e:
        conn.rollback()
        logger.error(f"Error creating sensor reading: {e}")
        raise
    finally:
        conn.close()


def get_latest_sensor_reading() -> Optional[SensorReading]:
    """Get the most recent sensor reading"""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, timestamp, ph, tds, turbidity FROM sensor_data ORDER BY timestamp DESC, id DESC LIMIT 1"
        )
        row = cur.fetchone()
        if not row:
            return None
        # Convert row to dict and parse timestamp
        row_dict = dict(row)
        # Parse timestamp string to datetime if it's a string
        if isinstance(row_dict['timestamp'], str):
            row_dict['timestamp'] = datetime.fromisoformat(row_dict['timestamp'].replace('Z', '+00:00'))
        return SensorReading(**row_dict)
    except Exception as e:
        logger.error(f"Error getting latest sensor reading: {e}")
        raise
    finally:
        conn.close()


def get_history(period: str) -> List[HistoryPoint]:
    """Get historical sensor data for a given period"""
    now = datetime.utcnow()
    if period == "1day":
        start = now - timedelta(days=1)
    elif period == "1month":
        start = now - timedelta(days=30)
    elif period == "6months":
        start = now - timedelta(days=180)
    else:
        raise ValueError(f"Invalid period: {period}. Use '1day', '1month', or '6months'")

    conn = get_connection()
    try:
        cur = conn.cursor()
        # Use ISO format for timestamp comparison
        # SQLite stores timestamps as strings, so we compare as strings
        start_str = start.strftime('%Y-%m-%d %H:%M:%S')
        cur.execute(
            """
            SELECT timestamp as time, ph, tds, turbidity
            FROM sensor_data
            WHERE timestamp >= ?
            ORDER BY timestamp ASC
            """,
            (start_str,),
        )
        rows = cur.fetchall()
        return [HistoryPoint(**row) for row in rows]
    except Exception as e:
        logger.error(f"Error getting history: {e}")
        raise
    finally:
        conn.close()
