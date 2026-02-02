import httpx
import asyncio
import json
import logging
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

BASE_URL = "http://localhost:8000"

async def test_pipeline():
    logger.info("🚀 Starting End-to-End Pipeline Test")
    
    # 1. Test Health Endpoint
    logger.info("\n1️⃣  Testing Health Endpoint...")
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.get(f"{BASE_URL}/health")
            resp.raise_for_status()
            health_data = resp.json()
            logger.info(f"✅ Health Check Passed: {json.dumps(health_data, indent=2)}")
            
            if not health_data.get("earth_engine_initialized"):
                logger.warning("⚠️ Google Earth Engine NOT initialized")
            if not health_data.get("vector_store_initialized"):
                logger.warning("⚠️ Vector Store NOT initialized")
            if not health_data.get("llm_service_initialized"):
                logger.warning("⚠️ LLM Service NOT initialized")
                
        except Exception as e:
            logger.error(f"❌ Health Check Failed: {str(e)}")
            return

    # 2. Test Analyze AOI (Phase 3)
    logger.info("\n2️⃣  Testing Analyze AOI (Phase 3)...")
    
    # Sample AOI (a small area in San Francisco)
    aoi_payload = {
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [-122.420, 37.770],
                [-122.410, 37.770],
                [-122.410, 37.780],
                [-122.420, 37.780],
                [-122.420, 37.770]
            ]]
        },
        "start_date": "2023-01-01",
        "end_date": "2023-06-30"
    }
    
    aoi_id = None
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            resp = await client.post(f"{BASE_URL}/api/analyze-aoi", json=aoi_payload)
            resp.raise_for_status()
            analysis_data = resp.json()
            aoi_id = analysis_data.get("aoi_id")
            
            logger.info("✅ Analysis Successful!")
            logger.info(f"   AOI ID: {aoi_id}")
            logger.info(f"   NDVI Mean: {analysis_data['metrics']['ndvi'].get('mean')}")
            logger.info(f"   Built-up %: {analysis_data['metrics'].get('built_up_pct')}")
            logger.info(f"   Water %: {analysis_data['metrics'].get('water_coverage_pct')}")
            logger.info(f"   Summaries: {len(analysis_data['summaries'])}")
            
        except httpx.HTTPStatusError as e:
             logger.error(f"❌ Analysis Failed: {e.response.text}")
             return
        except Exception as e:
            logger.error(f"❌ Analysis Failed: {str(e)}")
            return

    # 3. Test RAG Query (Phase 4 & 5)
    logger.info("\n3️⃣  Testing RAG Query (Phase 4 & 5)...")
    
    query_payload = {
        "question": "What is the vegetation coverage and built-up area in this region?",
        "aoi_id": aoi_id,  # Query specific AOI we just analyzed
        "top_k": 3
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            resp = await client.post(f"{BASE_URL}/api/query", json=query_payload)
            resp.raise_for_status()
            query_data = resp.json()
            
            logger.info("✅ Query Successful!")
            logger.info(f"   Question: {query_data['question']}")
            logger.info(f"   Answer: {query_data['answer']}")
            logger.info(f"   Confidence: {query_data['confidence']}")
            logger.info(f"   Sources Used: {len(query_data['sources'])}")
            
        except httpx.HTTPStatusError as e:
            logger.error(f"❌ Query Failed: {e.response.text}")
        except Exception as e:
            logger.error(f"❌ Query Failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_pipeline())
