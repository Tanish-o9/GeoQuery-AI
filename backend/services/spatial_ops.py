from shapely.geometry import shape, mapping, Point, Polygon, LineString, MultiPolygon
from shapely.ops import nearest_points
import geopandas as gpd
import pyproj
from shapely.ops import transform
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class SpatialOpsService:
    """Service utilizing Shapely and GeoPandas for coordinate geometry, topological operations, and spatial searches"""

    def __init__(self):
        # Configure standard coordinate projection transformer: EPSG:4326 (WGS84 degrees) to EPSG:32643 (UTM zone 43N meters)
        self.project_to_utm = pyproj.Transformer.from_crs("epsg:4326", "epsg:32643", always_xy=True).transform
        self.project_to_wgs = pyproj.Transformer.from_crs("epsg:32643", "epsg:4326", always_xy=True).transform

        # Mock database layers for Spatial Search queries
        self.hospitals = [
            {"id": "h1", "name": "Civil Hospital Sector 12", "coords": [72.628, 23.224]},
            {"id": "h2", "name": "Apollo Clinic Gandhi Nagar", "coords": [72.645, 23.232]},
            {"id": "h3", "name": "Shalby Multispecialty", "coords": [72.668, 23.215]}
        ]
        self.schools = [
            {"id": "s1", "name": "Kendriya Vidyalaya Sector 30", "coords": [72.632, 23.242]},
            {"id": "s2", "name": "Mount Carmel High School", "coords": [72.648, 23.218]}
        ]
        self.rivers = [
            # Sabarmati river polygon approximation
            Polygon([[72.65, 23.20], [72.66, 23.20], [72.67, 23.25], [72.66, 23.25], [72.65, 23.20]])
        ]

    def measure_geometry(self, geojson_geom: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate exact geodesic Area (m²), Perimeter (m), and Centroid coordinates"""
        try:
            geom = shape(geojson_geom)
            
            # Project geometry to UTM zone 43N meters for exact measurements
            geom_utm = transform(self.project_to_utm, geom)
            
            area_m2 = geom_utm.area
            perimeter_m = geom_utm.length  # length of polygon boundary is its perimeter
            
            centroid_utm = geom_utm.centroid
            # Transform centroid back to WGS84
            centroid_wgs = transform(self.project_to_wgs, centroid_utm)
            
            return {
                "area_sq_meters": round(area_m2, 2),
                "area_hectares": round(area_m2 / 10000.0, 2),
                "perimeter_meters": round(perimeter_m, 2),
                "centroid": [centroid_wgs.y, centroid_wgs.x]
            }
        except Exception as e:
            logger.error(f"Measurement tool failed: {str(e)}")
            raise ValueError(f"Geometry measurement failed: {str(e)}")

    def run_spatial_operation(self, operation: str, geom_a_dict: Dict[str, Any], geom_b_dict: Optional[Dict[str, Any]] = None, buffer_dist_meters: float = 0.0) -> Dict[str, Any]:
        """Perform topological spatial operations: buffer, union, intersection, difference, convex_hull"""
        try:
            geom_a = shape(geom_a_dict)
            geom_a_utm = transform(self.project_to_utm, geom_a)

            if operation == "buffer":
                buffered_utm = geom_a_utm.buffer(buffer_dist_meters)
                buffered_wgs = transform(self.project_to_wgs, buffered_utm)
                return {
                    "operation": "buffer",
                    "buffer_distance_m": buffer_dist_meters,
                    "geometry": mapping(buffered_wgs)
                }
                
            elif operation == "convex_hull":
                hull_utm = geom_a_utm.convex_hull
                hull_wgs = transform(self.project_to_wgs, hull_utm)
                return {
                    "operation": "convex_hull",
                    "geometry": mapping(hull_wgs)
                }

            # Operations requiring secondary geometry input
            if not geom_b_dict:
                raise ValueError(f"Operation '{operation}' requires a secondary geometry shape input.")
                
            geom_b = shape(geom_b_dict)
            geom_b_utm = transform(self.project_to_utm, geom_b)

            if operation == "intersection":
                res_utm = geom_a_utm.intersection(geom_b_utm)
            elif operation == "union":
                res_utm = geom_a_utm.union(geom_b_utm)
            elif operation == "difference":
                res_utm = geom_a_utm.difference(geom_b_utm)
            else:
                raise ValueError(f"Unsupported spatial operation type: {operation}")

            res_wgs = transform(self.project_to_wgs, res_utm)
            return {
                "operation": operation,
                "geometry": mapping(res_wgs)
            }

        except Exception as e:
            logger.error(f"Topological operation {operation} failed: {str(e)}")
            raise ValueError(f"Spatial operation error: {str(e)}")

    def search_nearby_hospitals(self, center_coords: List[float], radius_km: float) -> List[Dict[str, Any]]:
        """Spatial Search: Find hospitals within X km of target center coordinate"""
        center_pt = Point(center_coords[0], center_coords[1]) # lon, lat
        center_utm = transform(self.project_to_utm, center_pt)
        
        matches = []
        radius_meters = radius_km * 1000.0
        
        for h in self.hospitals:
            h_pt = Point(h["coords"][0], h["coords"][1])
            h_utm = transform(self.project_to_utm, h_pt)
            dist = center_utm.distance(h_utm)
            if dist <= radius_meters:
                h_copy = h.copy()
                h_copy["distance_meters"] = round(dist, 1)
                matches.append(h_copy)
                
        return matches

    def search_schools_inside_polygon(self, geom_dict: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Spatial Search: Filter schools points contained inside drawn polygon boundary"""
        poly = shape(geom_dict)
        matches = []
        
        for s in self.schools:
            s_pt = Point(s["coords"][0], s["coords"][1])
            if poly.contains(s_pt):
                matches.append(s)
                
        return matches

spatial_ops_service = SpatialOpsService()
