import logging
import geopandas as gpd
from shapely.geometry import shape, Point, Polygon
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple
import random

logger = logging.getLogger(__name__)

class SpatialAnalystService:
    """Service for processing spatial data using GeoPandas and Shapely"""
    
    def __init__(self):
        self.initialized = True
        
    def analyze_geometry(self, geojson_geom: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze a GeoJSON polygon, computing area, perimeter, land use, 
        and nearby amenities (hospitals, schools, roads, rivers).
        """
        try:
            # Convert GeoJSON to Shapely shape
            sh = shape(geojson_geom)
            if not isinstance(sh, (Polygon, shape.__class__)):
                # If geometry is a Feature or FeatureCollection, extract geometry
                if geojson_geom.get("type") == "Feature":
                    sh = shape(geojson_geom["geometry"])
                else:
                    raise ValueError("Geometry must be a Polygon or MultiPolygon")
                    
            # Create a GeoSeries / GeoDataFrame in EPSG:4326 (WGS84)
            gdf = gpd.GeoDataFrame(index=[0], crs="EPSG:4326", geometry=[sh])
            
            # Reproject to estimate UTM CRS for metric calculations (area, perimeter)
            try:
                projected_crs = gdf.estimate_utm_crs()
                projected_gdf = gdf.to_crs(projected_crs)
            except Exception as e:
                logger.warning(f"Could not estimate UTM projection: {str(e)}. Falling back to EPSG:3857.")
                projected_gdf = gdf.to_crs(epsg=3857) # Web Mercator
                
            geom_proj = projected_gdf.geometry.iloc[0]
            
            # Calculate metrics
            area_sq_m = geom_proj.area
            area_hectares = area_sq_m / 10000.0
            area_sq_km = area_sq_m / 1000000.0
            perimeter_m = geom_proj.length
            
            centroid = sh.centroid
            lat, lon = centroid.y, centroid.x
            
            # Generate simulated/derived spatial analytics based on coordinates
            # Let's seed random using coordinate hash to keep values stable for same location
            coord_seed = int((abs(lat) * 100000 + abs(lon) * 100000) % 10000000)
            rng = np.random.default_rng(coord_seed)
            
            # 1. Nearby Amenities Simulation (Hospitals, Schools, Roads, Rivers)
            amenities = self._detect_nearby_amenities(centroid, rng)
            
            # 2. Land Use Detection
            land_use = self._detect_land_use(lat, lon, rng)
            
            # 3. Population Estimation
            # Dynamic proxy based on proximity to hospital centers / land use
            urban_pct = land_use.get("urban", 10.0)
            population = int(area_sq_km * (150 + urban_pct * 80) * rng.uniform(0.8, 1.2))
            # Limit minimum population for tiny areas
            if area_sq_km < 0.05:
                population = int(population * 0.1)
                
            # 4. Flood Risk Assessment
            # Highly positive with water bodies coverage, river proximity
            rivers_dist = min([r["distance_m"] for r in amenities["rivers"]]) if amenities["rivers"] else 1000
            water_pct = land_use.get("water", 0.0)
            
            if water_pct > 15 or rivers_dist < 200:
                flood_score = rng.uniform(70, 95)
                flood_risk = "High"
            elif water_pct > 5 or rivers_dist < 500:
                flood_score = rng.uniform(40, 69)
                flood_risk = "Moderate"
            else:
                flood_score = rng.uniform(5, 39)
                flood_risk = "Low"
                
            return {
                "area": {
                    "sq_m": round(area_sq_m, 2),
                    "hectares": round(area_hectares, 3),
                    "sq_km": round(area_sq_km, 4)
                },
                "perimeter_m": round(perimeter_m, 2),
                "centroid": {
                    "latitude": round(lat, 6),
                    "longitude": round(lon, 6)
                },
                "population_estimation": population,
                "flood_risk": {
                    "level": flood_risk,
                    "score_pct": round(flood_score, 1),
                    "factors": [
                        f"Proximity to water body: {water_pct:.1f}% surface water",
                        f"Closest major channel: {rivers_dist:.0f}m",
                        f"Elevation fluctuation proxy: {rng.uniform(1, 15):.1f}m slope"
                    ]
                },
                "land_use": land_use,
                "amenities": amenities
            }
        except Exception as e:
            logger.error(f"Error in analyze_geometry: {str(e)}")
            raise
            
    def _detect_nearby_amenities(self, centroid: Point, rng: np.random.Generator) -> Dict[str, Any]:
        """Detect simulated hospitals, schools, roads, and rivers near centroid"""
        lat, lon = centroid.y, centroid.x
        
        # Roads (names, category, length, distance)
        road_prefixes = ["Highway", "Main St", "Ring Road", "Avenue", "Expressway", "Lane"]
        roads = []
        for i in range(rng.integers(3, 7)):
            dist = rng.uniform(50, 1000)
            roads.append({
                "name": f"{rng.choice(road_prefixes)} {rng.integers(1, 100)}",
                "type": rng.choice(["Primary", "Secondary", "Tertiary", "Residential"]),
                "distance_m": round(dist, 1),
                "density_index": round(rng.uniform(0.5, 4.5), 2)
            })
        roads = sorted(roads, key=lambda x: x["distance_m"])
        
        # Rivers
        river_names = ["Red River", "Blue Stream", "Green Canal", "Crystal Creek", "Valley River"]
        rivers = []
        for i in range(rng.integers(1, 3)):
            dist = rng.uniform(100, 3000)
            rivers.append({
                "name": rng.choice(river_names),
                "width_m": round(rng.uniform(5, 50), 1),
                "distance_m": round(dist, 1)
            })
        rivers = sorted(rivers, key=lambda x: x["distance_m"])
        
        # Hospitals
        hospitals = []
        hosp_names = ["Grace Medical", "St. Jude Hospital", "Central Clinic", "County General", "GeoHealth Center"]
        for i in range(rng.integers(1, 4)):
            dist = rng.uniform(150, 2500)
            hospitals.append({
                "name": rng.choice(hosp_names),
                "beds": int(rng.integers(20, 300)),
                "distance_m": round(dist, 1),
                "emergency_service": bool(rng.choice([True, True, False]))
            })
        hospitals = sorted(hospitals, key=lambda x: x["distance_m"])
        
        # Schools
        schools = []
        school_names = ["Oakridge Academy", "Green Valley School", "Science High", "Pioneer Elementary", "Lakeside Public"]
        for i in range(rng.integers(2, 5)):
            dist = rng.uniform(100, 2000)
            schools.append({
                "name": rng.choice(school_names),
                "type": rng.choice(["Primary", "Secondary", "High School"]),
                "students_count": int(rng.integers(150, 800)),
                "distance_m": round(dist, 1)
            })
        schools = sorted(schools, key=lambda x: x["distance_m"])
        
        return {
            "roads": roads,
            "rivers": rivers,
            "hospitals": hospitals,
            "schools": schools
        }
        
    def _detect_land_use(self, lat: float, lon: float, rng: np.random.Generator) -> Dict[str, float]:
        """Detect land use percentages"""
        # Determine base weights dynamically based on coordinates
        # If in a coordinate range likely to be urban (simulated), boost urban
        h = hash((lat, lon)) % 5
        if h == 0: # Urban dominate
            urban = rng.uniform(60, 85)
            veg = rng.uniform(5, 20)
            agri = rng.uniform(5, 15)
            water = rng.uniform(1, 5)
        elif h == 1: # Vegetation dominate
            urban = rng.uniform(2, 10)
            veg = rng.uniform(65, 90)
            agri = rng.uniform(5, 15)
            water = rng.uniform(1, 10)
        elif h == 2: # Agriculture dominate
            urban = rng.uniform(5, 15)
            veg = rng.uniform(10, 25)
            agri = rng.uniform(55, 75)
            water = rng.uniform(2, 8)
        else: # Balanced / bare soil
            urban = rng.uniform(10, 30)
            veg = rng.uniform(20, 40)
            agri = rng.uniform(20, 40)
            water = rng.uniform(2, 10)
            
        total = urban + veg + agri + water
        bare = rng.uniform(1, 10)
        total += bare
        
        return {
            "urban": round((urban / total) * 100, 1),
            "vegetation": round((veg / total) * 100, 1),
            "agriculture": round((agri / total) * 100, 1),
            "water": round((water / total) * 100, 1),
            "bare_soil": round((bare / total) * 100, 1)
        }

# Global Instance
spatial_analyst = SpatialAnalystService()
