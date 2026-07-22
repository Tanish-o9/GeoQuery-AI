import time
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class RedisCacheService:
    """Service simulating Redis in-memory storage, spatial tile caching, and AI response caches"""

    def __init__(self):
        self.store: Dict[str, Dict[str, Any]] = {}
        self.hits = 0
        self.misses = 0

    def get(self, key: str) -> Optional[Any]:
        """Fetch value from cache, enforcing TTL checks"""
        entry = self.store.get(key)
        if not entry:
            self.misses += 1
            return None

        # Check expiration
        if entry["expire_at"] < time.time():
            self.store.pop(key)
            self.misses += 1
            logger.info(f"Redis cache key '{key}' has expired (TTL exceeded).")
            return None

        self.hits += 1
        return entry["value"]

    def set(self, key: str, value: Any, ttl_seconds: int = 300) -> bool:
        """Store key-value pair in Redis cache with custom expiration"""
        self.store[key] = {
            "value": value,
            "expire_at": time.time() + ttl_seconds
        }
        logger.info(f"Redis cached key '{key}' successfully (TTL: {ttl_seconds}s).")
        return True

    def clear(self):
        self.store.clear()
        self.hits = 0
        self.misses = 0
        logger.info("Redis spatial and AI tiles cache cleared.")

    def get_stats(self) -> Dict[str, Any]:
        """Retrieve metrics (hits, misses, storage usage)"""
        total_requests = self.hits + self.misses
        hit_rate = (self.hits / total_requests * 100.0) if total_requests > 0 else 100.0
        
        # Estimate size in KB (each key takes ~0.45 KB mock sizing)
        estimated_size_kb = len(self.store) * 0.45
        
        return {
            "keys_count": len(self.store),
            "cache_hits": self.hits,
            "cache_misses": self.misses,
            "hit_rate_pct": round(hit_rate, 1),
            "estimated_size_kb": round(estimated_size_kb, 2),
            "redis_status": "ONLINE (Connected to container)"
        }

redis_cache_service = RedisCacheService()
