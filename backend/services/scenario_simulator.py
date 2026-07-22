import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class ScenarioSimulatorService:
    """Service simulating 'what-if' environmental and demographic scenarios"""

    def simulate_outcome(self, rainfall_pct_change: float, population_multiplier: float, new_road_built: bool) -> Dict[str, Any]:
        """
        Evaluate future predictions under shifted risk multipliers:
        - Rainfall increases (e.g. +20%) -> Increases flood risk scores.
        - Population doubles (e.g. 2.0x) -> Elevates traffic congestion.
        - New road built -> Reduces traffic congestion by redistributing capacity.
        """
        logger.info(f"Simulating: Rainfall change={rainfall_pct_change}%, Pop multiplier={population_multiplier}x, Road built={new_road_built}")

        # Base metrics (Gandhi Nagar context)
        base_flood_risk = 35.0
        base_congestion = 42.0
        base_suitability = 78.0

        # Apply rainfall change
        # Every 10% rainfall rise adds 12% to flood risk
        flood_risk_delta = (rainfall_pct_change / 10.0) * 12.0
        final_flood_risk = min(100.0, max(0.0, base_flood_risk + flood_risk_delta))

        # Apply population multiplier
        # Every 1.0x pop addition adds 25% to congestion
        congestion_delta = (population_multiplier - 1.0) * 25.0
        final_congestion = base_congestion + congestion_delta

        # Apply road build impact
        # New road reduces congestion by 18%
        if new_road_built:
            final_congestion = max(10.0, final_congestion - 18.0)

        final_congestion = min(100.0, final_congestion)

        # Recalculate suitability index (heavier flood risk and congestion lowers score)
        suitability_deduction = (final_flood_risk * 0.3) + (final_congestion * 0.2)
        final_suitability = max(10.0, min(100.0, base_suitability + 15.0 - suitability_deduction))

        return {
            "rainfall_pct_change": rainfall_pct_change,
            "population_multiplier": population_multiplier,
            "new_road_built": new_road_built,
            "metrics": {
                "flood_risk_score": round(final_flood_risk, 1),
                "traffic_congestion_score": round(final_congestion, 1),
                "overall_suitability_index": round(final_suitability, 1)
            },
            "interpretation": (
                f"Under this scenario, flood risk shifts to {final_flood_risk:.1f}% (critical risk zone warnings active). "
                f"Traffic congestion indexes at {final_congestion:.1f}% due to demographic load. "
                f"Infrastructure site suitability ratings are corrected to {final_suitability:.1f}%."
            )
        }

scenario_simulator_service = ScenarioSimulatorService()
