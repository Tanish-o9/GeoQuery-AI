from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from services.advanced_gis import advanced_gis_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["gis_ai"])

# -----------------
# Request schemas
# -----------------

class GeometrySchema(BaseModel):
    type: str
    coordinates: List[Any]

class HistoricalCompareRequest(BaseModel):
    geometry: Dict[str, Any] = Field(..., description="GeoJSON coordinates boundary")
    year1: int
    year2: int

class NDVIStressRequest(BaseModel):
    geometry: Dict[str, Any] = Field(..., description="GeoJSON coordinates boundary")

class FloodRiskRequest(BaseModel):
    geometry: Dict[str, Any] = Field(..., description="GeoJSON coordinates boundary")
    rainfall_mm: float
    elevation_m: float
    river_distance_m: float
    historical_floods_count: int

class TrafficCongestionRequest(BaseModel):
    geometry: Dict[str, Any] = Field(..., description="GeoJSON coordinates boundary")
    weather: str
    hour: int

class UrbanExpansionRequest(BaseModel):
    geometry: Dict[str, Any] = Field(..., description="GeoJSON coordinates boundary")
    initial_pop: int
    growth_rate_pct: float

class SmartCityRequest(BaseModel):
    geometry: Dict[str, Any] = Field(..., description="GeoJSON coordinates boundary")

class EmergencyRouteRequest(BaseModel):
    geometry: Dict[str, Any] = Field(..., description="GeoJSON coordinates boundary")
    service_type: str

# -----------------
# Routing Handlers
# -----------------

@router.post("/api/gis/historical-compare")
async def historical_compare(request: HistoricalCompareRequest):
    try:
        logger.info(f"Comparing satellite datasets between {request.year1} and {request.year2}")
        result = advanced_gis_service.compute_historical_comparison(request.geometry, request.year1, request.year2)
        return result
    except Exception as e:
        logger.error(f"Error in historical compare: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/gis/ndvi-heatmap")
async def ndvi_heatmap(request: NDVIStressRequest):
    try:
        logger.info("Generating spatial crop index stress grid")
        result = advanced_gis_service.generate_ndvi_stress_grid(request.geometry)
        return result
    except Exception as e:
        logger.error(f"Error in ndvi stress grid: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/predict/flood")
async def predict_flood(request: FloodRiskRequest):
    try:
        logger.info("Computing autonomous flood hazard probabilities")
        result = advanced_gis_service.predict_flood_risk(
            request.geometry,
            request.rainfall_mm,
            request.elevation_m,
            request.river_distance_m,
            request.historical_floods_count
        )
        return result
    except Exception as e:
        logger.error(f"Error in flood prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/predict/traffic")
async def predict_traffic(request: TrafficCongestionRequest):
    try:
        logger.info("Running spatial road network congestion simulation")
        result = advanced_gis_service.predict_traffic_congestion(request.geometry, request.weather, request.hour)
        return result
    except Exception as e:
        logger.error(f"Error in traffic prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/predict/urban-expansion")
async def predict_urban_expansion(request: UrbanExpansionRequest):
    try:
        logger.info("Projecting future demographic growth boundaries")
        result = advanced_gis_service.project_urban_expansion(request.geometry, request.initial_pop, request.growth_rate_pct)
        return result
    except Exception as e:
        logger.error(f"Error in expansion projection: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/gis/smart-city")
async def smart_city(request: SmartCityRequest):
    try:
        logger.info("Compiling city index scoring metric indices")
        result = advanced_gis_service.generate_smart_city_scorecard(request.geometry)
        return result
    except Exception as e:
        logger.error(f"Error in smart city scorecard: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/routing/emergency")
async def routing_emergency(request: EmergencyRouteRequest):
    try:
        logger.info(f"Computing emergency routes bypass for {request.service_type}")
        result = advanced_gis_service.compute_emergency_response_routing(request.geometry, request.service_type)
        return result
    except Exception as e:
        logger.error(f"Error in routing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/gis/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    resolution: str = Form("10m/pixel")
):
    try:
        logger.info(f"Analyzing uploaded satellite image {file.filename} with resolution {resolution}")
        result = advanced_gis_service.classify_uploaded_image(file.filename, resolution)
        return result
    except Exception as e:
        logger.error(f"Error in upload image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
