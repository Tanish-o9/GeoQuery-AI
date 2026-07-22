from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, Any
from services.report_generator import report_generator
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/report", tags=["report"])

class ReportRequest(BaseModel):
    format: str # "pdf" or "docx"
    analysis_data: Dict[str, Any]

@router.post("/generate")
async def generate_report(request: ReportRequest):
    """
    Generate a professional GIS analytics report in PDF or DOCX format
    based on the provided spatial analysis statistics.
    """
    try:
        fmt = request.format.lower().strip()
        if fmt == "pdf":
            pdf_stream = report_generator.generate_pdf(request.analysis_data)
            return StreamingResponse(
                pdf_stream,
                media_type="application/pdf",
                headers={"Content-Disposition": "attachment; filename=geoquery_report.pdf"}
            )
        elif fmt == "docx":
            docx_stream = report_generator.generate_docx(request.analysis_data)
            return StreamingResponse(
                docx_stream,
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers={"Content-Disposition": "attachment; filename=geoquery_report.docx"}
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported format: {fmt}. Use 'pdf' or 'docx'."
            )
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Report compilation failed: {str(e)}"
        )
