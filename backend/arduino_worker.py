import logging
import time
from typing import Optional

import serial
import requests

from .schemas import SensorReadingCreate
from .db import init_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

PORT = "COM3"  # Adjust if needed
BAUD_RATE = 9600
API_URL = "http://127.0.0.1:8000/sensor"
MAX_RETRIES = 3
RETRY_DELAY = 2


def parse_sensor_line(line: str) -> Optional[SensorReadingCreate]:
    """
    Parse sensor data from Arduino serial line.
    Expected format: "pH: 7.2 TDS: 145 Turbidity: 2.3"
    or variations with different spacing/delimiters
    """
    if not line or len(line.strip()) == 0:
        return None
    
    try:
        # Try multiple parsing strategies
        # Strategy 1: Split by spaces and look for numeric values after keywords
        parts = line.split()
        
        ph_value = None
        tds_value = None
        turbidity_value = None
        
        # Look for pH value (can be after "pH:", "ph:", or at index 1)
        for i, part in enumerate(parts):
            part_lower = part.lower()
            if 'ph' in part_lower and i + 1 < len(parts):
                try:
                    ph_value = float(parts[i + 1].replace(':', ''))
                except (ValueError, IndexError):
                    pass
        
        # Look for TDS value
        for i, part in enumerate(parts):
            part_lower = part.lower()
            if 'tds' in part_lower and i + 1 < len(parts):
                try:
                    tds_value = float(parts[i + 1].replace(':', ''))
                except (ValueError, IndexError):
                    pass
        
        # Look for Turbidity value
        for i, part in enumerate(parts):
            part_lower = part.lower()
            if 'turbidity' in part_lower or 'turb' in part_lower:
                if i + 1 < len(parts):
                    try:
                        turbidity_value = float(parts[i + 1].replace(':', ''))
                    except (ValueError, IndexError):
                        pass
        
        # Fallback: try positional parsing (pH at index 1, TDS at 4, Turbidity at 6)
        if ph_value is None and len(parts) > 1:
            try:
                ph_value = float(parts[1].replace(':', ''))
            except (ValueError, IndexError):
                pass
        
        if tds_value is None and len(parts) > 4:
            try:
                tds_value = float(parts[4].replace(':', ''))
            except (ValueError, IndexError):
                pass
        
        if turbidity_value is None and len(parts) > 6:
            try:
                turbidity_value = float(parts[6].replace(':', ''))
            except (ValueError, IndexError):
                pass
        
        # Validate all values are present and in reasonable ranges
        if ph_value is None or tds_value is None or turbidity_value is None:
            logger.warning(f"Incomplete sensor data from line: {line}")
            return None
        
        if not (0 <= ph_value <= 14):
            logger.warning(f"Invalid pH value: {ph_value}")
            return None
        
        if tds_value < 0 or tds_value > 10000:
            logger.warning(f"TDS value out of reasonable range: {tds_value}")
            # Don't reject, just warn
        
        if turbidity_value < 0 or turbidity_value > 100:
            logger.warning(f"Turbidity value out of reasonable range: {turbidity_value}")
            # Don't reject, just warn
        
        return SensorReadingCreate(ph=ph_value, tds=tds_value, turbidity=turbidity_value)
        
    except (IndexError, ValueError, Exception) as e:
        logger.debug(f"Failed to parse line '{line}': {e}")
        return None


def send_sensor_data(data: SensorReadingCreate, retries: int = MAX_RETRIES) -> bool:
    """Send sensor data to the API with retry logic"""
    for attempt in range(retries):
        try:
            response = requests.post(
                API_URL,
                json={"ph": data.ph, "tds": data.tds, "turbidity": data.turbidity},
                timeout=5
            )
            if response.status_code == 200:
                logger.debug(f"Successfully sent sensor data: pH={data.ph}, TDS={data.tds}, Turbidity={data.turbidity}")
                return True
            else:
                logger.warning(f"API returned status {response.status_code}: {response.text}")
        except requests.exceptions.RequestException as e:
            logger.warning(f"Attempt {attempt + 1}/{retries} failed to send data: {e}")
            if attempt < retries - 1:
                time.sleep(RETRY_DELAY)
    
    logger.error(f"Failed to send sensor data after {retries} attempts")
    return False


def main() -> None:
    """Main function to read from Arduino and send to API"""
    logger.info("Initializing Arduino worker...")
    init_db()
    
    # Try to connect to Arduino
    arduino = None
    connection_retries = 5
    for attempt in range(connection_retries):
        try:
            arduino = serial.Serial(PORT, BAUD_RATE, timeout=1)
            logger.info(f"Connected to Arduino on {PORT}")
            time.sleep(2)  # Wait for Arduino to initialize
            break
        except serial.SerialException as e:
            logger.warning(f"Attempt {attempt + 1}/{connection_retries} to connect to Arduino failed: {e}")
            if attempt < connection_retries - 1:
                time.sleep(2)
            else:
                logger.error(f"Failed to connect to Arduino after {connection_retries} attempts")
                logger.error("Please check:")
                logger.error(f"  1. Arduino is connected to {PORT}")
                logger.error(f"  2. No other program is using the serial port")
                logger.error(f"  3. Correct port number (current: {PORT})")
                return
    
    consecutive_errors = 0
    max_consecutive_errors = 10
    
    try:
        while True:
            try:
                if arduino.in_waiting > 0:
                    line = arduino.readline().decode("utf-8", errors="ignore").strip()
                    if not line:
                        continue
                    
                    logger.debug(f"Received line: {line}")
                    data = parse_sensor_line(line)
                    
                    if data is not None:
                        if send_sensor_data(data):
                            consecutive_errors = 0
                        else:
                            consecutive_errors += 1
                    else:
                        logger.debug(f"Could not parse line: {line}")
                
                # Small delay to prevent CPU spinning
                time.sleep(0.1)
                
                # Check for too many consecutive errors
                if consecutive_errors >= max_consecutive_errors:
                    logger.error(f"Too many consecutive errors ({consecutive_errors}). Stopping worker.")
                    break
                    
            except Exception as e:
                logger.error(f"Error in main loop: {e}")
                consecutive_errors += 1
                time.sleep(1)
                
    except KeyboardInterrupt:
        logger.info("Arduino worker stopped by user")
    finally:
        if arduino and arduino.is_open:
            arduino.close()
            logger.info("Arduino connection closed")


if __name__ == "__main__":
    main()
