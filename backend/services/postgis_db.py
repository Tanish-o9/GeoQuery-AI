import os
import logging
import json
import sqlite3
from typing import Dict, List, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class PostGISDatabaseService:
    """Service for database operations, supporting PostgreSQL/PostGIS and SQLite fallbacks"""
    
    def __init__(self):
        self.initialized = False
        self.use_sqlite = True
        self.sqlite_path = "./geoquery_local.db"
        self.pg_conn = None
        
    def initialize(self) -> bool:
        """Initialize connection, checking environment variables for PostgreSQL"""
        pg_host = os.getenv("PG_HOST")
        pg_database = os.getenv("PG_DATABASE")
        
        if pg_host and pg_database:
            try:
                # Attempt to import and connect to Postgres
                import psycopg2
                from psycopg2.extras import RealDictCursor
                
                user = os.getenv("PG_USER", "postgres")
                password = os.getenv("PG_PASSWORD", "")
                port = os.getenv("PG_PORT", "5432")
                
                self.pg_conn = psycopg2.connect(
                    host=pg_host,
                    port=port,
                    database=pg_database,
                    user=user,
                    password=password
                )
                self.pg_conn.autocommit = True
                self.use_sqlite = False
                self.initialized = True
                logger.info("Successfully connected to Enterprise PostgreSQL/PostGIS database")
                self._setup_pg_schema()
                return True
            except Exception as e:
                logger.error(f"Failed to connect to PostgreSQL/PostGIS: {str(e)}. Falling back to local SQLite.")
                
        # SQLite Fallback
        try:
            self.use_sqlite = True
            self.initialized = True
            logger.info(f"Initializing local SQLite storage at {self.sqlite_path}")
            self._setup_sqlite_schema()
            return True
        except Exception as e:
            logger.error(f"Failed to initialize SQLite database: {str(e)}")
            self.initialized = False
            return False
            
    def _setup_pg_schema(self):
        """Set up PostgreSQL tables, enabling PostGIS if available"""
        try:
            with self.pg_conn.cursor() as cur:
                # Enable PostGIS extension if superuser permits
                try:
                    cur.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
                except Exception as ex:
                    logger.warning(f"Could not enable PostGIS extension (might lack permissions): {str(ex)}")
                
                # Create AOI table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS aois (
                        aoi_id VARCHAR(50) PRIMARY KEY,
                        geometry GEOMETRY(Polygon, 4326),
                        properties JSONB,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """)
                # Create Index
                try:
                    cur.execute("CREATE INDEX IF NOT EXISTS aois_geom_idx ON aois USING GIST (geometry);")
                except Exception:
                    pass
                    
                # Create Chat history table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS chat_history (
                        id SERIAL PRIMARY KEY,
                        session_id VARCHAR(50),
                        role VARCHAR(20),
                        content TEXT,
                        commands JSONB,
                        reasoning TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """)
                
                # Create settings table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS user_settings (
                        key VARCHAR(50) PRIMARY KEY,
                        value JSONB,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """)
                logger.info("PostgreSQL database schemas verified.")
        except Exception as e:
            logger.error(f"Error setting up PostgreSQL schemas: {str(e)}")
            
    def _setup_sqlite_schema(self):
        """Set up SQLite tables"""
        conn = sqlite3.connect(self.sqlite_path)
        try:
            with conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS aois (
                        aoi_id TEXT PRIMARY KEY,
                        geometry TEXT, -- Stored as GeoJSON string
                        properties TEXT, -- Stored as JSON string
                        created_at TEXT
                    );
                """)
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS chat_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        session_id TEXT,
                        role TEXT,
                        content TEXT,
                        commands TEXT, -- JSON string
                        reasoning TEXT,
                        created_at TEXT
                    );
                """)
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS user_settings (
                        key TEXT PRIMARY KEY,
                        value TEXT, -- JSON string
                        updated_at TEXT
                    );
                """)
                logger.info("SQLite database schemas verified.")
        except Exception as e:
            logger.error(f"Error setting up SQLite schemas: {str(e)}")
        finally:
            conn.close()

    def save_aoi(self, aoi_id: str, geometry: Dict[str, Any], properties: Dict[str, Any]) -> bool:
        """Save an Area of Interest (polygon) to the database"""
        if not self.initialized:
            self.initialize()
            
        if self.use_sqlite:
            conn = sqlite3.connect(self.sqlite_path)
            try:
                with conn:
                    conn.execute(
                        "INSERT OR REPLACE INTO aois (aoi_id, geometry, properties, created_at) VALUES (?, ?, ?, ?)",
                        (aoi_id, json.dumps(geometry), json.dumps(properties), datetime.utcnow().isoformat())
                    )
                return True
            except Exception as e:
                logger.error(f"SQLite save_aoi error: {str(e)}")
                return False
            finally:
                conn.close()
        else:
            try:
                with self.pg_conn.cursor() as cur:
                    # Convert GeoJSON dict to PostGIS Geometry
                    geom_geojson = json.dumps(geometry)
                    cur.execute(
                        "INSERT INTO aois (aoi_id, geometry, properties) VALUES (%s, ST_GeomFromGeoJSON(%s), %s) ON CONFLICT (aoi_id) DO UPDATE SET geometry=ST_GeomFromGeoJSON(%s), properties=%s",
                        (aoi_id, geom_geojson, json.dumps(properties), geom_geojson, json.dumps(properties))
                    )
                return True
            except Exception as e:
                logger.error(f"PostgreSQL save_aoi error: {str(e)}")
                return False

    def get_aois(self) -> List[Dict[str, Any]]:
        """Retrieve all saved AOIs"""
        if not self.initialized:
            self.initialize()
            
        if self.use_sqlite:
            conn = sqlite3.connect(self.sqlite_path)
            try:
                conn.row_factory = sqlite3.Row
                cur = conn.cursor()
                cur.execute("SELECT * FROM aois ORDER BY created_at DESC")
                results = []
                for row in cur.fetchall():
                    results.append({
                        "aoi_id": row["aoi_id"],
                        "geometry": json.loads(row["geometry"]),
                        "properties": json.loads(row["properties"]),
                        "created_at": row["created_at"]
                    })
                return results
            except Exception as e:
                logger.error(f"SQLite get_aois error: {str(e)}")
                return []
            finally:
                conn.close()
        else:
            try:
                from psycopg2.extras import RealDictCursor
                with self.pg_conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("SELECT aoi_id, ST_AsGeoJSON(geometry) as geometry_str, properties, created_at FROM aois ORDER BY created_at DESC")
                    results = []
                    for row in cur.fetchall():
                        results.append({
                            "aoi_id": row["aoi_id"],
                            "geometry": json.loads(row["geometry_str"]),
                            "properties": row["properties"],
                            "created_at": row["created_at"].isoformat()
                        })
                    return results
            except Exception as e:
                logger.error(f"PostgreSQL get_aois error: {str(e)}")
                return []

    def save_chat_message(self, session_id: str, role: str, content: str, commands: List[Dict[str, Any]] = None, reasoning: str = "") -> bool:
        """Save a chat message to history"""
        if not self.initialized:
            self.initialize()
            
        cmds_str = json.dumps(commands or [])
        if self.use_sqlite:
            conn = sqlite3.connect(self.sqlite_path)
            try:
                with conn:
                    conn.execute(
                        "INSERT INTO chat_history (session_id, role, content, commands, reasoning, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                        (session_id, role, content, cmds_str, reasoning, datetime.utcnow().isoformat())
                    )
                return True
            except Exception as e:
                logger.error(f"SQLite save_chat_message error: {str(e)}")
                return False
            finally:
                conn.close()
        else:
            try:
                with self.pg_conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO chat_history (session_id, role, content, commands, reasoning) VALUES (%s, %s, %s, %s, %s)",
                        (session_id, role, content, cmds_str, reasoning)
                    )
                return True
            except Exception as e:
                logger.error(f"PostgreSQL save_chat_message error: {str(e)}")
                return False

    def get_chat_history(self, session_id: str) -> List[Dict[str, Any]]:
        """Retrieve recent chat history for a session"""
        if not self.initialized:
            self.initialize()
            
        if self.use_sqlite:
            conn = sqlite3.connect(self.sqlite_path)
            try:
                conn.row_factory = sqlite3.Row
                cur = conn.cursor()
                cur.execute("SELECT role, content, commands, reasoning, created_at FROM chat_history WHERE session_id = ? ORDER BY id ASC LIMIT 50", (session_id,))
                results = []
                for row in cur.fetchall():
                    results.append({
                        "role": row["role"],
                        "content": row["content"],
                        "commands": json.loads(row["commands"] or "[]"),
                        "reasoning": row["reasoning"],
                        "created_at": row["created_at"]
                    })
                return results
            except Exception as e:
                logger.error(f"SQLite get_chat_history error: {str(e)}")
                return []
            finally:
                conn.close()
        else:
            try:
                from psycopg2.extras import RealDictCursor
                with self.pg_conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("SELECT role, content, commands, reasoning, created_at FROM chat_history WHERE session_id = %s ORDER BY id ASC LIMIT 50", (session_id,))
                    results = []
                    for row in cur.fetchall():
                        results.append({
                            "role": row["role"],
                            "content": row["content"],
                            "commands": row["commands"],
                            "reasoning": row["reasoning"],
                            "created_at": row["created_at"].isoformat()
                        })
                    return results
            except Exception as e:
                logger.error(f"PostgreSQL get_chat_history error: {str(e)}")
                return []

    def save_settings(self, key: str, value: Dict[str, Any]) -> bool:
        """Save settings"""
        if not self.initialized:
            self.initialize()
            
        val_str = json.dumps(value)
        if self.use_sqlite:
            conn = sqlite3.connect(self.sqlite_path)
            try:
                with conn:
                    conn.execute(
                        "INSERT OR REPLACE INTO user_settings (key, value, updated_at) VALUES (?, ?, ?)",
                        (key, val_str, datetime.utcnow().isoformat())
                    )
                return True
            except Exception as e:
                logger.error(f"SQLite save_settings error: {str(e)}")
                return False
            finally:
                conn.close()
        else:
            try:
                with self.pg_conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO user_settings (key, value) VALUES (%s, %s) ON CONFLICT (key) DO UPDATE SET value=%s, updated_at=CURRENT_TIMESTAMP",
                        (key, val_str, val_str)
                    )
                return True
            except Exception as e:
                logger.error(f"PostgreSQL save_settings error: {str(e)}")
                return False

    def get_settings(self, key: str) -> Optional[Dict[str, Any]]:
        """Retrieve settings by key"""
        if not self.initialized:
            self.initialize()
            
        if self.use_sqlite:
            conn = sqlite3.connect(self.sqlite_path)
            try:
                cur = conn.cursor()
                cur.execute("SELECT value FROM user_settings WHERE key = ?", (key,))
                row = cur.fetchone()
                return json.loads(row[0]) if row else None
            except Exception as e:
                logger.error(f"SQLite get_settings error: {str(e)}")
                return None
            finally:
                conn.close()
        else:
            try:
                with self.pg_conn.cursor() as cur:
                    cur.execute("SELECT value FROM user_settings WHERE key = %s", (key,))
                    row = cur.fetchone()
                    return row[0] if row else None
            except Exception as e:
                logger.error(f"PostgreSQL get_settings error: {str(e)}")
                return None

# Global Instance
db_service = PostGISDatabaseService()
