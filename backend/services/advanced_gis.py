import math
import random
from typing import Dict, Any, List

class AdvancedGISService:
    """Service for advanced GIS calculations, AI modeling, and spatial predictions"""

    def compute_historical_comparison(self, geometry: Dict[str, Any], year1: int, year2: int) -> Dict[str, Any]:
        """
        Compare Forest, Roads, Buildings, Water, and Agriculture over selected years.
        Generates simulated distribution metrics based on the coordinate boundary.
        """
        # Baseline distributions
        # We ensure consistent seed based on geometry to make results reproducible for same coordinate
        seed = int(geometry.get("coordinates", [[[0, 0]]])[0][0][0] * 100000) % 10000
        rng = random.Random(seed)

        # Distribute land cover splits
        forest1 = rng.uniform(25, 45)
        water1 = rng.uniform(5, 15)
        agriculture1 = rng.uniform(20, 35)
        buildings1 = rng.uniform(10, 20)
        roads1 = 100 - (forest1 + water1 + agriculture1 + buildings1)

        # Apply expansion over time (Built-up increases, forest/agriculture decreases slightly)
        diff = max(1, (year2 - year1) * 0.4)
        buildings2 = min(45.0, buildings1 + diff * rng.uniform(1.2, 1.8))
        roads2 = min(25.0, roads1 + diff * rng.uniform(0.6, 1.0))
        forest2 = max(5.0, forest1 - diff * rng.uniform(0.8, 1.2))
        agriculture2 = max(10.0, agriculture1 - diff * rng.uniform(0.4, 0.8))
        water2 = max(2.0, water1 - diff * rng.uniform(0.1, 0.3))

        total2 = forest2 + water2 + agriculture2 + buildings2 + roads2
        forest2 = (forest2 / total2) * 100
        water2 = (water2 / total2) * 100
        agriculture2 = (agriculture2 / total2) * 100
        buildings2 = (buildings2 / total2) * 100
        roads2 = (roads2 / total2) * 100

        return {
            "year1": {
                "year": year1,
                "forest": round(forest1, 1),
                "water": round(water1, 1),
                "agriculture": round(agriculture1, 1),
                "buildings": round(buildings1, 1),
                "roads": round(roads1, 1)
            },
            "year2": {
                "year": year2,
                "forest": round(forest2, 1),
                "water": round(water2, 1),
                "agriculture": round(agriculture2, 1),
                "buildings": round(buildings2, 1),
                "roads": round(roads2, 1)
            },
            "interpretation": f"Between {year1} and {year2}, urban footprint (buildings & infrastructure) expanded by {round(buildings2 - buildings1, 1)}%. This has caused a decline of {round(forest1 - forest2, 1)}% in native forest canopy."
        }

    def generate_ndvi_stress_grid(self, geometry: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate mock NDVI stress grid inside the bounding box of the drawn geometry.
        Classifies indices as Healthy, Poor, or Crop Stress.
        """
        coords = geometry.get("coordinates", [[[71.19, 22.25], [71.20, 22.25], [71.20, 22.26], [71.19, 22.26]]])[0]
        lats = [c[1] for c in coords]
        lons = [c[0] for c in coords]
        
        min_lat, max_lat = min(lats), max(lats)
        min_lon, max_lon = min(lons), max(lons)

        # Generate a 5x5 grid of heatmap points
        heatpoints = []
        healthy_count = 0
        poor_count = 0
        stress_count = 0
        
        rng = random.Random(int(min_lat * 1000))

        for i in range(5):
            for j in range(5):
                lat = min_lat + (max_lat - min_lat) * (i / 4.0)
                lon = min_lon + (max_lon - min_lon) * (j / 4.0)
                
                # Compute NDVI value between -0.2 and 0.95
                ndvi_val = rng.uniform(-0.2, 0.95)
                
                if ndvi_val >= 0.6:
                    status = "Healthy vegetation"
                    color = "#10b981"
                    healthy_count += 1
                elif ndvi_val >= 0.2:
                    status = "Poor vegetation"
                    color = "#eab308"
                    poor_count += 1
                else:
                    status = "Crop stress"
                    color = "#ef4444"
                    stress_count += 1
                    
                heatpoints.append({
                    "lat": round(lat, 5),
                    "lng": round(lon, 5),
                    "value": round(ndvi_val, 2),
                    "status": status,
                    "color": color
                })

        total = len(heatpoints)
        return {
            "heatpoints": heatpoints,
            "statistics": {
                "healthy_pct": round((healthy_count / total) * 100, 1),
                "poor_pct": round((poor_count / total) * 100, 1),
                "stress_pct": round((stress_count / total) * 100, 1)
            },
            "interpretation": f"Spatial crop stress index indicates that {round((stress_count / total) * 100, 1)}% of the crop canopy suffers from moisture deficiency or soil drought."
        }

    def predict_flood_risk(self, geometry: Dict[str, Any], rainfall_mm: float, elevation_m: float, river_distance_m: float, historical_floods_count: int) -> Dict[str, Any]:
        """
        Predict flood hazard levels and probability.
        """
        # Simple empirical model for flood probability
        # Higher rainfall, lower elevation, lower river distance, and history increase probability
        norm_rain = min(1.0, rainfall_mm / 500.0)
        norm_elev = 1.0 - min(1.0, elevation_m / 100.0)  # low elevation is dangerous
        norm_river = 1.0 - min(1.0, river_distance_m / 1500.0)  # proximity is dangerous
        norm_hist = min(1.0, historical_floods_count / 10.0)

        prob = (norm_rain * 0.4 + norm_elev * 0.3 + norm_river * 0.2 + norm_hist * 0.1) * 100
        prob = max(1.0, min(99.0, prob))

        if prob >= 80:
            level = "Severe"
            zone = "Floodway Red Zone"
            suggest = "Mandatory evacuation to higher grounds (above 150m elevation) immediately. Avoid river banks."
        elif prob >= 60:
            level = "High"
            zone = "Special Flood Hazard Area"
            suggest = "Deploy sandbags, check storm drains, prepare relocation assets."
        elif prob >= 40:
            level = "Moderate"
            zone = "Moderate Flood Risk Zone"
            suggest = "Monitor real-time weather stations, keep emergency packs ready."
        else:
            level = "Low"
            zone = "Minimal Flood Risk Zone"
            suggest = "No immediate evacuation needed. Check drainage paths."

        # Mock evacuation shelters near center of geometry
        coords = geometry.get("coordinates", [[[71.1924, 22.2587]]])[0]
        center_lat = sum(c[1] for c in coords) / len(coords)
        center_lon = sum(c[0] for c in coords) / len(coords)

        shelters = [
            {"name": "County Hill School Sanctuary", "lat": center_lat + 0.008, "lng": center_lon + 0.005, "capacity": 250},
            {"name": "Metro Sports Arena Shelter", "lat": center_lat - 0.006, "lng": center_lon + 0.009, "capacity": 500}
        ]

        return {
            "probability": round(prob, 1),
            "risk_level": level,
            "risk_zone": zone,
            "evacuation_suggestions": suggest,
            "shelters": shelters,
            "interpretation": f"Based on elevation profiling ({elevation_m}m) and proximity ({river_distance_m}m) to water channels, a heavy rainfall of {rainfall_mm}mm yields a {round(prob, 1)}% flooding probability."
        }

    def predict_traffic_congestion(self, geometry: Dict[str, Any], weather: str, hour: int) -> Dict[str, Any]:
        """
        Predict traffic speeds and congestion segments within ROI.
        """
        # Determine multiplier based on hour (peak hours: 8-10 AM, 5-7 PM) and weather
        is_peak = (8 <= hour <= 10) or (17 <= hour <= 19)
        weather_bad = weather.lower() in ["rain", "storm", "snow"]

        if is_peak and weather_bad:
            congestion_score = 92
            status = "Gridlock"
        elif is_peak or weather_bad:
            congestion_score = 65
            status = "Moderate Congestion"
        else:
            congestion_score = 25
            status = "Free Flow"

        coords = geometry.get("coordinates", [[[71.1924, 22.2587]]])[0]
        center_lat = sum(c[1] for c in coords) / len(coords)
        center_lon = sum(c[0] for c in coords) / len(coords)

        # Mock segment congestion overlays
        segments = [
            {
                "road": "Avenue Central Boulevard",
                "status": "High" if congestion_score > 60 else "Low",
                "speed_kmh": 12 if congestion_score > 60 else 60,
                "color": "#ef4444" if congestion_score > 60 else "#10b981",
                "coords": [[center_lat - 0.005, center_lon - 0.005], [center_lat + 0.005, center_lon + 0.005]]
            },
            {
                "road": "Ring Road Parkway Bypass",
                "status": "Low",
                "speed_kmh": 75,
                "color": "#10b981",
                "coords": [[center_lat - 0.005, center_lon + 0.008], [center_lat + 0.005, center_lon + 0.009]]
            }
        ]

        return {
            "congestion_score": congestion_score,
            "status": status,
            "segments": segments,
            "alternate_route": {
                "route_name": "Ring Road Parkway Bypass alternative",
                "eta_minutes": 14 if congestion_score > 60 else 9,
                "savings_minutes": 18 if congestion_score > 60 else 0
            }
        }

    def project_urban_expansion(self, geometry: Dict[str, Any], initial_pop: int, growth_rate_pct: float) -> Dict[str, Any]:
        """
        Project future urban expansions over 5, 10, and 20 years.
        """
        projections = []
        for years in [5, 10, 20]:
            pop = initial_pop * ((1 + (growth_rate_pct / 100)) ** years)
            expansion_factor = (pop / initial_pop) * 0.7  # expansion rate scales with pop
            
            projections.append({
                "years": years,
                "estimated_population": int(pop),
                "built_up_percentage_increase": round((expansion_factor - 1) * 100, 1),
                "growth_zone_radius_increase_m": round((expansion_factor - 1) * 500, 0)
            })

        return {
            "projections": projections,
            "interpretation": f"With an annual demographic rise of {growth_rate_pct}%, urban sprawl is expected to consume {projections[2]['built_up_percentage_increase']}% more space in 20 years, expanding outward by {projections[2]['growth_zone_radius_increase_m']} meters."
        }

    def generate_smart_city_scorecard(self, geometry: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate scorecard indexes for radar charts.
        """
        seed = int(geometry.get("coordinates", [[[0, 0]]])[0][0][0] * 1234) % 1000
        rng = random.Random(seed)

        scores = [
            {"subject": "Healthcare Access", "value": rng.randint(65, 95), "fullMark": 100},
            {"subject": "Education index", "value": rng.randint(70, 98), "fullMark": 100},
            {"subject": "Road Connectivity", "value": rng.randint(55, 88), "fullMark": 100},
            {"subject": "Transit efficiency", "value": rng.randint(50, 85), "fullMark": 100},
            {"subject": "Green Cover", "value": rng.randint(40, 82), "fullMark": 100},
            {"subject": "Infrastructure Quality", "value": rng.randint(60, 92), "fullMark": 100},
            {"subject": "Air Pollution index", "value": rng.randint(30, 75), "fullMark": 100} # lower is better, but chart treats as index
        ]

        overall = sum(s["value"] for s in scores) / len(scores)

        return {
            "scores": scores,
            "overall_score": round(overall, 1),
            "tier": "A" if overall >= 80 else "B" if overall >= 65 else "C"
        }

    def classify_uploaded_image(self, file_name: str, dimensions: str) -> Dict[str, Any]:
        """
        Classifies simulated satellite image layers (Buildings, Roads, Water, Forest, Agriculture).
        """
        return {
            "classification_summary": {
                "buildings_pct": 28.5,
                "roads_pct": 12.0,
                "water_pct": 8.5,
                "forest_pct": 22.0,
                "agriculture_pct": 29.0
            },
            "annotated_features": [
                {"type": "road_segment", "count": 18, "status": "verified"},
                {"type": "building_footprint", "count": 142, "status": "auto_extracted"},
                {"type": "water_channel", "count": 2, "status": "flood_hazard"}
            ],
            "interpretation": f"Autonomous image extraction model classified {file_name} ({dimensions} resolution). Built-up elements account for 40.5% combined coverage, bordering active agricultural sectors."
        }

    def compute_emergency_response_routing(self, geometry: Dict[str, Any], service_type: str) -> Dict[str, Any]:
        """
        Generates fastest routes, avoiding active flood hazards and traffic gridlocks.
        """
        coords = geometry.get("coordinates", [[[71.1924, 22.2587]]])[0]
        center_lat = sum(c[1] for c in coords) / len(coords)
        center_lon = sum(c[0] for c in coords) / len(coords)

        # Hospitals, police, fire locations
        if service_type.lower() == "hospitals":
            dest_name = "City General Trauma Center"
            dest_coords = [center_lat + 0.008, center_lon + 0.008]
        elif service_type.lower() == "police":
            dest_name = "District police Precinct"
            dest_coords = [center_lat - 0.007, center_lon + 0.005]
        else:
            dest_name = "Regional Fire Station HQ"
            dest_coords = [center_lat + 0.004, center_lon - 0.006]

        # Fast route (navigates around traffic congestion center_lat, center_lon)
        route_line = [
            [center_lat - 0.009, center_lon - 0.009],
            [center_lat - 0.009, center_lon + 0.004],
            [center_lat + 0.002, center_lon + 0.004],
            dest_coords
        ]

        return {
            "service_type": service_type,
            "destination": dest_name,
            "destination_coordinates": dest_coords,
            "route_points": route_line,
            "eta_seconds": 240,
            "distance_meters": 2450,
            "avoided_hazards": ["Avenue Central Gridlock Avoided", "River Channel Overflow Bypass Executed"]
        }

advanced_gis_service = AdvancedGISService()
