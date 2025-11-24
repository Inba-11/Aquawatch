import logging
import sqlite3
from pathlib import Path

logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).resolve().parent.parent / "aquawatch.db"


def get_connection() -> sqlite3.Connection:
    """Get a database connection with row factory"""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    # Enable foreign keys and WAL mode for better concurrency
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def init_db() -> None:
    """Initialize the database with required tables"""
    logger.info(f"Initializing database at {DB_PATH}")
    
    # Ensure parent directory exists
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    conn = get_connection()
    cur = conn.cursor()

    try:
        # Create sensor_data table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS sensor_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                ph REAL NOT NULL CHECK(ph >= 0 AND ph <= 14),
                tds REAL NOT NULL CHECK(tds >= 0),
                turbidity REAL NOT NULL CHECK(turbidity >= 0)
            )
            """
        )
        
        # Create index on timestamp for faster queries
        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_sensor_data_timestamp 
            ON sensor_data(timestamp DESC)
            """
        )

        # Create pings table
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS pings (
                ping_id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                location_id TEXT NOT NULL,
                name TEXT,
                type TEXT NOT NULL,
                ph REAL CHECK(ph IS NULL OR (ph >= 0 AND ph <= 14)),
                tds REAL CHECK(tds IS NULL OR tds >= 0),
                turbidity REAL CHECK(turbidity IS NULL OR turbidity >= 0),
                lat REAL,
                lon REAL,
                status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'resolved')),
                comments TEXT
            )
            """
        )
        
        # Create index on timestamp for faster queries
        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_pings_timestamp 
            ON pings(timestamp DESC)
            """
        )

        # Try to add comments column if it doesn't exist (for existing databases)
        try:
            cur.execute("ALTER TABLE pings ADD COLUMN comments TEXT")
            logger.info("Added comments column to pings table")
        except sqlite3.OperationalError:
            # Column already exists, ignore
            pass

        conn.commit()
        logger.info("Database initialized successfully")
        
    except Exception as e:
        conn.rollback()
        logger.error(f"Error initializing database: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    init_db()
