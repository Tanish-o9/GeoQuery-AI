from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any, List, Optional
from services.postgis_db import db_service
from services.spatial_analyst import spatial_analyst
import logging
import random

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/dashboard")
async def get_dashboard_data(aoi_id: Optional[str] = None):
    """
    Get aggregate GIS statistics for the Enterprise Analytics Dashboard.
    If an aoi_id is provided, returns statistics computed for that specific boundary,
    otherwise aggregates data across all analyzed regions.
    """
    try:
        # Check database for active AOIs
        aois = db_service.get_aois()
        
        active_analysis = None
        if aoi_id:
            # Find matching AOI
            match = next((a for a in aois if a["aoi_id"] == aoi_id), None)
            if match and "analysis" in match["properties"]:
                active_analysis = match["properties"]["analysis"]
        elif aois and "analysis" in aois[0]["properties"]:
            active_analysis = aois[0]["properties"]["analysis"]
            
        # 1. Base KPIs
        if active_analysis:
            pop = active_analysis["population_estimation"]
            area_ha = active_analysis["area"]["hectares"]
            flood_score = active_analysis["flood_risk"]["score_pct"]
            hosp_count = len(active_analysis["amenities"]["hospitals"])
            school_count = len(active_analysis["amenities"]["schools"])
            road_density = len(active_analysis["amenities"]["roads"]) * 1.2
        else:
            # Fallback global mock dashboard metrics
            pop = 45000
            area_ha = 1240.5
            flood_score = 35.0
            hosp_count = 5
            school_count = 12
            road_density = 4.2
            
        # 2. Dynamic Charts Payload
        # Chart A: NDVI & Rainfall correlation over 12 months
        weather_time_series = []
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        base_ndvi = 0.4
        base_rain = 20.0
        
        for idx, month in enumerate(months):
            # Simulate season (Monsoon in Jun-Sep)
            is_monsoon = 5 <= idx <= 8
            rain = random.uniform(150, 450) if is_monsoon else random.uniform(5, 40)
            ndvi = base_ndvi + (0.25 if is_monsoon else random.uniform(-0.05, 0.08))
            temp = random.uniform(24, 30) if is_monsoon else (random.uniform(32, 40) if 2 <= idx <= 4 else random.uniform(18, 25))
            pollution = random.uniform(40, 95) if idx in [10, 11, 0, 1] else random.uniform(20, 55) # Winter smog
            
            weather_time_series.append({
                "month": month,
                "ndvi": round(max(0.0, min(1.0, ndvi)), 2),
                "rainfall_mm": round(rain, 1),
                "temperature_c": round(temp, 1),
                "pollution_aqi": round(pollution, 1)
            })
            
        # Chart B: Land Use Breakdown (Ready for Recharts pie chart)
        if active_analysis:
            lu = active_analysis["land_use"]
            land_use_chart = [
                {"name": "Urban/Built-up", "value": lu["urban"], "color": "#ef4444"},
                {"name": "Vegetation", "value": lu["vegetation"], "color": "#10b981"},
                {"name": "Agriculture", "value": lu["agriculture"], "color": "#f59e0b"},
                {"name": "Water Bodies", "value": lu["water"], "color": "#3b82f6"},
                {"name": "Bare Soil", "value": lu["bare_soil"], "color": "#6b7280"}
            ]
        else:
            land_use_chart = [
                {"name": "Urban/Built-up", "value": 25.0, "color": "#ef4444"},
                {"name": "Vegetation", "value": 35.0, "color": "#10b981"},
                {"name": "Agriculture", "value": 20.0, "color": "#f59e0b"},
                {"name": "Water Bodies", "value": 10.0, "color": "#3b82f6"},
                {"name": "Bare Soil", "value": 10.0, "color": "#6b7280"}
            ]
            
        return {
            "summary": {
                "population": pop,
                "area_hectares": area_ha,
                "road_density_index": round(road_density, 2),
                "hospitals_count": hosp_count,
                "schools_count": school_count,
                "flood_risk_pct": flood_score,
                "avg_temperature_c": 26.5,
                "avg_rainfall_mm": 110.0,
                "avg_pollution_aqi": 48.0
            },
            "time_series": weather_time_series,
            "land_use": land_use_chart
        }
    except Exception as e:
        logger.error(f"Error compiling dashboard stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error generating analytics metrics"
        )
