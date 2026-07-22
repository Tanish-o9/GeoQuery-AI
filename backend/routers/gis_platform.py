from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from services.spatial_ops import spatial_ops_service
from services.satellite_interpreter import satellite_interpreter_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["gis_platform"])

# -----------------
# Request schemas
# -----------------

class SpatialOpRequest(BaseModel):
    operation: str
    geometry_a: Dict[str, Any]
    geometry_b: Optional[Dict[str, Any]] = None
    buffer_distance_meters: float = 0.0

class MeasureRequest(BaseModel):
    geometry: Dict[str, Any]

class SpatialSearchRequest(BaseModel):
    search_type: str  # hospitals_nearby | schools_inside
    geometry: Optional[Dict[str, Any]] = None
    center_coords: Optional[List[float]] = None
    radius_km: float = 1.0

# -----------------
# Spatial API Routes
# -----------------

@router.post("/api/gis/spatial-ops")
async def run_spatial_operation(request: SpatialOpRequest):
    try:
        result = spatial_ops_service.run_spatial_operation(
            request.operation,
            request.geometry_a,
            request.geometry_b,
            request.buffer_distance_meters
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/gis/measure")
async def measure_shape(request: MeasureRequest):
    try:
        result = spatial_ops_service.measure_geometry(request.geometry)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/gis/spatial-search")
async def run_spatial_search(request: SpatialSearchRequest):
    try:
        if request.search_type == "hospitals_nearby":
            if not request.center_coords:
                raise HTTPException(status_code=400, detail="center_coords list required for hospitals search.")
            return spatial_ops_service.search_nearby_hospitals(request.center_coords, request.radius_km)
            
        elif request.search_type == "schools_inside":
            if not request.geometry:
                raise HTTPException(status_code=400, detail="geometry polygon required for schools search.")
            return spatial_ops_service.search_schools_inside_polygon(request.geometry)
            
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported search type: {request.search_type}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------
# Satellite Imagery Interpreter
# -----------------

@router.post("/api/gis/satellite-interpret")
async def interpret_raster(
    file: UploadFile = File(...)
):
    try:
        logger.info(f"Uploading raster tile: {file.filename}")
        # Run mock segment classification
        result = satellite_interpreter_service.interpret_raster_imagery(file.filename)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------
# GEE Time Travel Imagery indices
# -----------------

@router.get("/api/gis/time-travel")
async def time_travel_indices(year: int):
    # Simulates temporal GEE index maps
    return {
        "year": year,
        "satellite_imagery_tile_layer": f"http://tiles.geoquery.ai/gee/{year}/{{z}}/{{x}}/{{y}}.png",
        "vegetation_index_ndvi_mean": 0.48 - ((year - 2010) * 0.01), # Simulates loss of forest cover Gandhi Nagar over years
        "urban_built_up_percentage": 12.5 + ((year - 2010) * 1.5) # Simulates urban sprawl Gandhinagar
    }
