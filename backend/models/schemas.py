from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Any, Optional
from datetime import datetime


class AOIAnalysisRequest(BaseModel):
    """Request model for AOI analysis"""
    geometry: Dict[str, Any] = Field(
        ...,
        description="GeoJSON geometry object (Polygon or Rectangle)",
        examples=[{
            "type": "Polygon",
            "coordinates": [[[78.0, 20.0], [79.0, 20.0], [79.0, 21.0], [78.0, 21.0], [78.0, 20.0]]]
        }]
    )
    start_date: str = Field(
        ...,
        description="Start date in YYYY-MM-DD format",
        examples=["2023-01-01"]
    )
    end_date: str = Field(
        ...,
        description="End date in YYYY-MM-DD format",
        examples=["2024-01-01"]
    )

    @field_validator('start_date', 'end_date')
    @classmethod
    def validate_date_format(cls, v: str) -> str:
        """Validate date format"""
        try:
            datetime.strptime(v, '%Y-%m-%d')
            return v
        except ValueError:
            raise ValueError('Date must be in YYYY-MM-DD format')

    @field_validator('end_date')
    @classmethod
    def validate_date_range(cls, v: str, info) -> str:
        """Validate that end_date is after start_date"""
        if 'start_date' in info.data:
            start = datetime.strptime(info.data['start_date'], '%Y-%m-%d')
            end = datetime.strptime(v, '%Y-%m-%d')
            if end <= start:
                raise ValueError('end_date must be after start_date')
            if end > datetime.now():
                raise ValueError('end_date cannot be in the future')
        return v


class MetricData(BaseModel):
    """Individual metric data"""
    mean: Optional[float] = Field(None, description="Mean value")
    min: Optional[float] = Field(None, description="Minimum value")
    max: Optional[float] = Field(None, description="Maximum value")
    trend: Optional[str] = Field(None, description="Trend description (increasing/decreasing/stable)")


class MetricsResponse(BaseModel):
    """Response model for computed metrics"""
    aoi_id: str = Field(..., description="Unique identifier for this AOI analysis")
    coordinates: Dict[str, Any] = Field(..., description="Original GeoJSON geometry")
    date_range: Dict[str, str] = Field(..., description="Analysis date range")
    metrics: Dict[str, Any] = Field(
        ...,
        description="Computed metrics (NDVI, built_up_pct, water_coverage_pct)",
        examples=[{
            "ndvi": {"mean": 0.65, "trend": "increasing"},
            "built_up_pct": 23.4,
            "water_coverage_pct": 5.2
        }]
    )
    summaries: List[str] = Field(
        ...,
        description="Textual summaries of the metrics",
        examples=[
            "The selected area shows 65% vegetation coverage with an increasing trend.",
            "Built-up area accounts for 23.4% of the region.",
            "Water bodies cover approximately 5.2% of the area."
        ]
    )
    spatial_analysis: Optional[Dict[str, Any]] = Field(
        None,
        description="Detailed spatial calculations from GeoPandas & Shapely"
    )
    time_series_data: Optional[List[Dict[str, Any]]] = Field(
        None,
        description="Historical data for charting (e.g., monthly NDVI)",
        examples=[[
            {"date": "2023-01", "ndvi": 0.45},
            {"date": "2023-02", "ndvi": 0.48}
        ]]
    )
    timestamp: str = Field(
        default_factory=lambda: datetime.utcnow().isoformat(),
        description="Analysis timestamp"
    )


class QueryRequest(BaseModel):
    """Request model for natural language queries"""
    question: str = Field(
        ...,
        description="Natural language question about the analyzed areas",
        examples=[
            "What is the vegetation coverage in the analyzed areas?",
            "Has urbanization increased?",
            "How much water is present?"
        ],
        min_length=5,
        max_length=500
    )
    aoi_id: Optional[str] = Field(
        None,
        description="Optional: Specific AOI ID to query. If not provided, searches all analyzed areas."
    )
    top_k: Optional[int] = Field(
        default=5,
        description="Number of similar AOI analyses to retrieve",
        ge=1,
        le=10
    )


class SourceInfo(BaseModel):
    """Information about a source used in the answer"""
    aoi_id: str = Field(..., description="AOI identifier")
    similarity: float = Field(..., description="Similarity score (0-1)")
    date_range: Dict[str, str] = Field(..., description="Date range of the analysis")


class QueryResponse(BaseModel):
    """Response model for natural language queries"""
    question: str = Field(..., description="Original question")
    answer: str = Field(..., description="AI-generated answer based on satellite data")
    sources: List[SourceInfo] = Field(..., description="Sources used to generate the answer")
    confidence: str = Field(..., description="Confidence level (high/medium/low)")
    context_count: int = Field(..., description="Number of relevant contexts found")
    timestamp: str = Field(
        default_factory=lambda: datetime.utcnow().isoformat(),
        description="Query timestamp"
    )


class ErrorResponse(BaseModel):
    """Standardized error response"""
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")

