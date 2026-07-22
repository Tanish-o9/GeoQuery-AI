from fastapi import APIRouter, HTTPException, status
from models.schemas import AOIAnalysisRequest, MetricsResponse, ErrorResponse
from services.earth_engine import earth_engine_service
from services.vector_store import vector_store_service
from services.spatial_analyst import spatial_analyst
from services.postgis_db import db_service
import logging
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["analysis"])


@router.post(
    "/analyze-aoi",
    response_model=MetricsResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        500: {"model": ErrorResponse, "description": "Server error"}
    }
)
async def analyze_aoi(request: AOIAnalysisRequest):
    """
    Analyze an Area of Interest (AOI) using Google Earth Engine
    
    This endpoint receives AOI coordinates and date range, then computes:
    - NDVI (vegetation index)
    - Built-up area percentage
    - Water body coverage
    
    Returns computed metrics and textual summaries.
    Results are automatically stored in vector database for future queries.
    """
    try:
        # Check if Earth Engine is initialized
        if not earth_engine_service.initialized:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google Earth Engine not initialized. Please contact administrator."
            )
        
        # Convert GeoJSON to Earth Engine geometry
        try:
            ee_geometry = earth_engine_service.convert_geojson_to_ee_geometry(request.geometry)
        except Exception as e:
            logger.error(f"Error converting geometry: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid geometry: {str(e)}"
            )
        
        # Validate AOI
        is_valid, error_msg = earth_engine_service.validate_aoi(ee_geometry)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        
        # Compute metrics
        try:
            logger.info(f"Computing NDVI for AOI from {request.start_date} to {request.end_date}")
            ndvi_data = earth_engine_service.compute_ndvi(
                ee_geometry,
                request.start_date,
                request.end_date
            )
            
            logger.info("Computing built-up area percentage")
            built_up_pct = earth_engine_service.compute_built_up_area(ee_geometry)
            
            logger.info("Computing water coverage percentage")
            water_pct = earth_engine_service.compute_water_coverage(ee_geometry)

            logger.info("Computing time-series data")
            time_series_data = earth_engine_service.compute_time_series(
                ee_geometry,
                request.start_date,
                request.end_date
            )
            
        except Exception as e:
            logger.error(f"Error computing metrics: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error computing satellite metrics: {str(e)}"
            )
        
        # Generate textual summaries
        summaries = []
        
        # NDVI summary
        if ndvi_data.get('mean') is not None:
            ndvi_mean = ndvi_data['mean']
            ndvi_pct = ndvi_mean * 100
            trend = ndvi_data.get('trend', 'unknown')
            
            if ndvi_mean > 0.6:
                veg_type = "dense vegetation (forests)"
            elif ndvi_mean > 0.2:
                veg_type = "moderate vegetation (grasslands, crops)"
            else:
                veg_type = "sparse vegetation or bare soil"
            
            summary = f"The selected area shows {ndvi_pct:.1f}% vegetation coverage ({veg_type})"
            if trend != "unknown" and trend != "insufficient data":
                summary += f" with a {trend} trend over the analysis period"
            summary += "."
            
            # Add mock mode context if available
            if ndvi_data.get('context'):
                summary += f" {ndvi_data['context']}"
                
            summaries.append(summary)
        else:
            summaries.append("Insufficient satellite data available for vegetation analysis in this area.")
        
        # Built-up area summary
        if built_up_pct > 0:
            summaries.append(f"Built-up area accounts for {built_up_pct}% of the region.")
        else:
            summaries.append("No significant built-up area detected in this region.")
        
        # Water coverage summary
        if water_pct > 0:
            summaries.append(f"Water bodies cover approximately {water_pct}% of the area.")
        else:
            summaries.append("No significant water bodies detected in this area.")
        
        # Create response
        aoi_id = str(uuid.uuid4())
        metrics = {
            "ndvi": ndvi_data,
            "built_up_pct": built_up_pct,
            "water_coverage_pct": water_pct
        }
        date_range = {
            "start": request.start_date,
            "end": request.end_date
        }
        
        # Calculate extended spatial metrics
        logger.info("Performing GeoPandas and Shapely spatial calculation...")
        spatial_analysis_results = spatial_analyst.analyze_geometry(request.geometry)
        
        # Save to database (PostGIS / SQLite fallback)
        properties = {
            "metrics": metrics,
            "summaries": summaries,
            "date_range": date_range,
            "analysis": spatial_analysis_results
        }
        db_service.save_aoi(aoi_id, request.geometry, properties)
        logger.info(f"Stored AOI {aoi_id} in relational database")
        
        response = MetricsResponse(
            aoi_id=aoi_id,
            coordinates=request.geometry,
            date_range=date_range,
            metrics=metrics,
            summaries=summaries,
            spatial_analysis=spatial_analysis_results,
            time_series_data=time_series_data
        )
        
        # Store in vector database for RAG queries
        if vector_store_service.initialized:
            try:
                vector_store_service.add_aoi_analysis(
                    aoi_id=aoi_id,
                    summaries=summaries,
                    metrics=metrics,
                    coordinates=request.geometry,
                    date_range=date_range
                )
                logger.info(f"Stored AOI {aoi_id} in vector database")
            except Exception as e:
                logger.warning(f"Failed to store in vector database: {str(e)}")
                # Don't fail the request if vector storage fails
        
        logger.info(f"Successfully analyzed AOI: {response.aoi_id}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in analyze_aoi: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing your request"
        )

