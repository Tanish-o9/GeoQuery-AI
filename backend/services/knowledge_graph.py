from typing import Dict, Any, List

class KnowledgeGraphService:
    """Service generating relational node-link data structures for interactive spatial graphs"""

    def get_spatial_graph(self) -> Dict[str, Any]:
        """
        Compile nodes and links demonstrating dependency interactions:
        Population -> Road -> Hospital -> River -> Flood -> Weather -> Schools
        """
        nodes = [
            {"id": "population", "label": "Population Center", "type": "demographic", "val": 80},
            {"id": "road", "label": "Primary Road Network", "type": "infrastructure", "val": 60},
            {"id": "hospital", "label": "General Hospital", "type": "facility", "val": 70},
            {"id": "river", "label": "Sabarmati River Bed", "type": "natural", "val": 50},
            {"id": "flood", "label": "Lowland Flood Plains", "type": "hazard", "val": 90},
            {"id": "weather", "label": "Weather Monsoon Cycle", "type": "climate", "val": 40},
            {"id": "schools", "label": "Primary Schools Area", "type": "facility", "val": 65}
        ]

        links = [
            # Population depends on Roads for transit, and creates congestion
            {"source": "population", "target": "road", "relation": "creates traffic"},
            # Road network connects population to hospitals & schools
            {"source": "road", "target": "hospital", "relation": "provides access"},
            {"source": "road", "target": "schools", "relation": "provides access"},
            # Weather patterns dump water into the River
            {"source": "weather", "target": "river", "relation": "feeds water"},
            # River levels rising causes Flood
            {"source": "river", "target": "flood", "relation": "overflows into"},
            # Floods block road segments and compromise schools/hospitals
            {"source": "flood", "target": "road", "relation": "submerges segments"},
            {"source": "flood", "target": "hospital", "relation": "isolates access"},
            {"source": "flood", "target": "schools", "relation": "compromises structural safety"}
        ]

        return {
            "nodes": nodes,
            "links": links
        }

knowledge_graph_service = KnowledgeGraphService()
