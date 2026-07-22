from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from services.multi_agent_core import multi_agent_core
from services.scenario_simulator import scenario_simulator_service
from services.knowledge_graph import knowledge_graph_service
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
import json
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["ai_intelligence"])

# -----------------
# Request schemas
# -----------------

class ChatStreamRequest(BaseModel):
    message: str
    session_id: str = "default_session"

class SimulateRequest(BaseModel):
    rainfall_pct_change: float = 0.0
    population_multiplier: float = 1.0
    new_road_built: bool = False

class ReportDocRequest(BaseModel):
    project_name: str
    summary_text: str
    suitability_score: float
    metrics: Dict[str, Any]

# -----------------
# Chat Stream Route
# -----------------

@router.post("/api/ai/chat/stream")
async def chat_stream(request: ChatStreamRequest):
    try:
        # Runs the multi-agent decision StateGraph
        result = multi_agent_core.process_query(request.message, request.session_id)
        return result
    except Exception as e:
        logger.error(f"Error in multi-agent routing: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# -----------------
# Scenario Simulator
# -----------------

@router.post("/api/ai/simulate")
async def run_scenario(request: SimulateRequest):
    return scenario_simulator_service.simulate_outcome(
        request.rainfall_pct_change,
        request.population_multiplier,
        request.new_road_built
    )

# -----------------
# Knowledge Graph
# -----------------

@router.get("/api/ai/knowledge-graph")
async def get_knowledge_graph():
    return knowledge_graph_service.get_spatial_graph()

# -----------------
# PDF Report Generator
# -----------------

@router.post("/api/report/generate-doc")
async def generate_pdf_report(request: ReportDocRequest):
    try:
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
        story = []

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=22,
            textColor=colors.HexColor('#0284c7'),
            spaceAfter=12
        )
        subtitle_style = ParagraphStyle(
            'SubtitleStyle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.gray,
            spaceAfter=20
        )
        body_style = ParagraphStyle(
            'BodyStyle',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#374151'),
            spaceAfter=12
        )
        section_heading = ParagraphStyle(
            'SectionHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#1e1b4b'),
            spaceAfter=8,
            spaceBefore=14
        )

        # Title block
        story.append(Paragraph(f"GeoQuery AI - Executive Spatial Report", title_style))
        story.append(Paragraph(f"Workspace Study: {request.project_name}", subtitle_style))
        story.append(Spacer(1, 10))

        # Executive Summary
        story.append(Paragraph("Executive Summary", section_heading))
        story.append(Paragraph(request.summary_text, body_style))
        story.append(Spacer(1, 10))

        # Overall suitability rating
        story.append(Paragraph("Suitability Assessment Index", section_heading))
        story.append(Paragraph(f"Site suitability rating for hospital/infrastructure deployment: <b>{request.suitability_score}%</b>", body_style))
        story.append(Spacer(1, 10))

        # Metrics Table
        story.append(Paragraph("Analysis Metric Indices", section_heading))
        table_data = [["Spatial Parameter", "Value index"]]
        for k, v in request.metrics.items():
            val_str = f"{v:.2f}" if isinstance(v, float) else str(v)
            table_data.append([str(k).replace('_', ' ').capitalize(), val_str])

        metrics_table = Table(table_data, colWidths=[200, 150])
        metrics_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(metrics_table)

        doc.build(story)
        buffer.seek(0)
        
        headers = {
            'Content-Disposition': f'attachment; filename="GeoQuery_Spatial_Report_{request.project_name.replace(" ", "_")}.pdf"'
        }
        return StreamingResponse(buffer, media_type='application/pdf', headers=headers)
        
    except Exception as e:
        logger.error(f"Report compile failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
