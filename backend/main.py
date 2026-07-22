from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import analyze, query, chat, report, gis_dashboard, gis_ai, enterprise_routes, ai_routes, gis_platform, enterprise_platform
from services.earth_engine import earth_engine_service
from services.vector_store import vector_store_service
from services.llm_service import llm_service
from services.postgis_db import db_service
import logging
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="GeoQuery AI API",
    description="Geospatial intelligence platform powered by Google Earth Engine and RAG",
    version="1.0.0"
)

# Configure CORS
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting GeoQuery AI API...")
    
    # Initialize PostGIS / SQLite Database
    success = db_service.initialize()
    if success:
        logger.info("✓ Database Service initialized successfully")
    else:
        logger.warning("✗ Database Service initialization failed")
    
    # Initialize Google Earth Engine
    success = earth_engine_service.initialize_ee()
    if success:
        logger.info("✓ Google Earth Engine initialized successfully")
    else:
        logger.warning("✗ Google Earth Engine initialization failed")
        logger.warning("  Run 'earthengine authenticate' to set up credentials")
    
    # Initialize Vector Store
    success = vector_store_service.initialize()
    if success:
        logger.info("✓ Vector Store (ChromaDB) initialized successfully")
    else:
        logger.warning("✗ Vector Store initialization failed")
    
    # Initialize LLM Service
    success = llm_service.initialize()
    if success:
        logger.info("✓ LLM Service (Groq API) initialized successfully")
    else:
        logger.warning("✗ LLM Service initialization failed")
        logger.warning("  Check GROQ_API_KEY in .env file")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down GeoQuery AI API...")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "GeoQuery AI API",
        "earth_engine_initialized": earth_engine_service.initialized,
        "vector_store_initialized": vector_store_service.initialized,
        "llm_service_initialized": llm_service.initialized
    }


# Include routers
app.include_router(analyze.router)
app.include_router(query.router)
app.include_router(chat.router)
app.include_router(report.router)
app.include_router(gis_dashboard.router)
app.include_router(gis_ai.router)
app.include_router(enterprise_routes.router)
app.include_router(ai_routes.router)
app.include_router(gis_platform.router)
app.include_router(enterprise_platform.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

