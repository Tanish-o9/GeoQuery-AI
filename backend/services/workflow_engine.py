import time
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class WorkflowEngineService:
    """Service simulating compilation and execution of visual GIS workflow pipelines"""
    
    def __init__(self):
        # Default workflow templates
        self.templates = {
            "environmental_hazard_pipeline": {
                "id": "environmental_hazard_pipeline",
                "name": "Live Environmental Hazard & Risk Assessment",
                "description": "Extracts NDVI, estimates flood boundaries, and routes ambulances concurrently.",
                "nodes": [
                    {"id": "node_1", "type": "trigger", "label": "Area of Interest Drawn"},
                    {"id": "node_2", "type": "parallel", "label": "Fork Risk Analyses", "branches": ["ndvi_branch", "flood_branch"]},
                    {"id": "node_3", "type": "agent", "label": "AI Copilot Suitability Review"},
                    {"id": "node_4", "type": "condition", "label": "Risk Score > 60%", "yes": "node_5", "no": "node_6"},
                    {"id": "node_5", "type": "action", "label": "Dispatch Ambulance Route Highlight"},
                    {"id": "node_6", "type": "action", "label": "Store Analysis in Workspace"}
                ]
            },
            "urban_development_tracker": {
                "id": "urban_development_tracker",
                "name": "Temporal Urban Growth & Sprawl Predictor",
                "description": "Runs year-to-year comparisons and forecasts urban sprawl over 20 years.",
                "nodes": [
                    {"id": "node_1", "type": "trigger", "label": "Custom GeoJSON Uploaded"},
                    {"id": "node_2", "type": "loop", "label": "Compare Years (2015 -> 2025)"},
                    {"id": "node_3", "type": "action", "label": "Calculate Expansion Vector"},
                    {"id": "node_4", "type": "agent", "label": "Smart City Scorecard Compilation"}
                ]
            }
        }
        self.execution_history = []

    def execute_pipeline(self, pipeline_id: str, geometry: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute connected nodes sequentially or concurrently (simulated execution log).
        """
        template = self.templates.get(pipeline_id)
        if not template:
            raise ValueError(f"Workflow pipeline '{pipeline_id}' not found.")

        logger.info(f"Starting execution of GIS pipeline: {template['name']}")
        execution_steps = []
        start_time = time.time()
        
        # Step 1: Trigger
        execution_steps.append({
            "step": "Trigger Initialized",
            "node_id": "node_1",
            "status": "COMPLETED",
            "log": "Drawn coordinates boundary captured. Extracted UTM bounding box EPSG:32643."
        })
        
        # Step 2: Parallel
        execution_steps.append({
            "step": "Concurrency Fork Executed",
            "node_id": "node_2",
            "status": "COMPLETED",
            "log": "Parallel execution started: Branch 1 [NDVI Stress analysis] & Branch 2 [Flood Hazard score calculation] running simultaneously."
        })
        
        # Step 3: AI Agent
        execution_steps.append({
            "step": "AI GIS Copilot Analysis",
            "node_id": "node_3",
            "status": "COMPLETED",
            "log": "AI agent reviewed site characteristics: population density = 250/ha, flood risk level = Moderate."
        })
        
        # Step 4: Condition check
        # Hardcode a simulated decision threshold
        risk_pct = 68
        passed = risk_pct > 60
        execution_steps.append({
            "step": "Conditional evaluation",
            "node_id": "node_4",
            "status": "COMPLETED",
            "log": f"Condition evaluated: Risk Score {risk_pct}% > 60% threshold? Result = {passed}."
        })
        
        # Step 5: Action branch choice
        target_node = "node_5" if passed else "node_6"
        action_label = "Dispatch Ambulance Route Highlight" if passed else "Store Analysis in Workspace"
        
        execution_steps.append({
            "step": "Route Action triggered",
            "node_id": target_node,
            "status": "COMPLETED",
            "log": f"Executing branch node: {action_label}."
        })

        duration = time.time() - start_time
        result = {
            "pipeline_id": pipeline_id,
            "pipeline_name": template["name"],
            "status": "SUCCESS",
            "duration_seconds": round(duration + 0.4, 2),
            "execution_steps": execution_steps
        }
        
        self.execution_history.append(result)
        return result

    def get_templates(self) -> List[Dict[str, Any]]:
        return list(self.templates.values())

    def save_template(self, template_id: str, name: str, nodes: List[Dict[str, Any]]) -> Dict[str, Any]:
        new_template = {
            "id": template_id,
            "name": name,
            "description": "User-saved custom GIS pipeline template.",
            "nodes": nodes
        }
        self.templates[template_id] = new_template
        return new_template

workflow_engine_service = WorkflowEngineService()
