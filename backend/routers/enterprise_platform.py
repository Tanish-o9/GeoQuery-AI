from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from services.auth import auth_service
from services.redis_cache import redis_cache_service
from services.alembic_db import alembic_db_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["enterprise_platform"])

# -----------------
# Request schemas
# -----------------

class ResetPasswordRequest(BaseModel):
    email: str

class MfaVerifyRequest(BaseModel):
    email: str
    code: str

class InstallPluginRequest(BaseModel):
    plugin_id: str

# In-memory plugins catalog for demonstration
plugins_catalog = {
    "weather_gis": {"id": "weather_gis", "name": "Weather & Monsoon Predictor", "category": "Climate", "status": "Installed"},
    "traffic_gis": {"id": "traffic_gis", "name": "Real-time Traffic Congestion", "category": "Infrastructure", "status": "Installed"},
    "healthcare_gis": {"id": "healthcare_gis", "name": "Hospital Density Overlay", "category": "Healthcare", "status": "Installed"},
    "agri_gis": {"id": "agri_gis", "name": "NDVI Crop Health & Stress Monitor", "category": "Agriculture", "status": "Installed"},
    "eco_gis": {"id": "eco_gis", "name": "Forest Canopy Reserve Tracker", "category": "Environment", "status": "Available"},
    "tourism_gis": {"id": "tourism_gis", "name": "Tourism Landmarks & Transit Map", "category": "Tourism", "status": "Available"},
    "solar_gis": {"id": "solar_gis", "name": "Solar & Wind Suitability Models", "category": "Energy", "status": "Available"}
}

# -----------------
# MFA & Password Resets
# -----------------

@router.post("/api/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    success = auth_service.request_password_reset(request.email)
    if not success:
         raise HTTPException(status_code=404, detail="Email address not found.")
    return {"status": "success", "message": "Simulated password reset email dispatched."}

@router.post("/api/auth/verify-mfa")
async def verify_mfa(request: MfaVerifyRequest):
    success = auth_service.verify_mfa_code(request.email, request.code)
    if not success:
         raise HTTPException(status_code=401, detail="Invalid MFA code. Try code '123456' for verification.")
    return {"status": "success", "message": "MFA token authorized successfully."}

# -----------------
# Plugin Marketplace
# -----------------

@router.get("/api/plugins/list")
async def list_plugins():
    return list(plugins_catalog.values())

@router.post("/api/plugins/install")
async def install_plugin(request: InstallPluginRequest, authorization: Optional[str] = Header(None)):
    # Restrict installs to Admin or Manager
    if authorization and not auth_service.verify_role_permission(authorization, ["Admin", "Manager"]):
         raise HTTPException(status_code=403, detail="Forbidden. Admin or Manager role required to install plugins.")

    plugin = plugins_catalog.get(request.plugin_id)
    if not plugin:
        raise HTTPException(status_code=404, detail=f"Plugin '{request.plugin_id}' not found in catalog.")
        
    plugin["status"] = "Installed"
    auth_service.log_audit("admin@geoquery.ai", "INSTALL_PLUGIN", request.plugin_id)
    return {"status": "success", "message": f"Plugin '{plugin['name']}' installed successfully!"}

# -----------------
# Caching metrics
# -----------------

@router.get("/api/cache/status")
async def get_cache_status():
    return redis_cache_service.get_stats()

# -----------------
# Alembic Migrations
# -----------------

@router.post("/api/db/migrations")
async def trigger_migrations(authorization: Optional[str] = Header(None)):
    if authorization and not auth_service.verify_role_permission(authorization, ["Admin"]):
         raise HTTPException(status_code=403, detail="Forbidden. Only Administrators can run Alembic migrations.")
    logs = alembic_db_service.run_alembic_migrations()
    return {"status": "success", "migration_logs": logs}
