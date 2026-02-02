from fastapi import APIRouter, HTTPException, status
from models.schemas import QueryRequest, QueryResponse, SourceInfo, ErrorResponse
from services.vector_store import vector_store_service
from services.llm_service import llm_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["query"])


@router.post(
    "/query",
    response_model=QueryResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        500: {"model": ErrorResponse, "description": "Server error"},
        503: {"model": ErrorResponse, "description": "Service unavailable"}
    }
)
async def query_aoi(request: QueryRequest):
    """
    Query analyzed AOIs using natural language
    
    This endpoint uses RAG (Retrieval-Augmented Generation) to answer questions
    about previously analyzed Areas of Interest. It:
    1. Retrieves relevant AOI analyses from the vector database
    2. Uses an LLM to generate accurate, data-grounded answers
    3. Returns the answer with source citations
    
    The system is designed to prevent hallucinations by only using retrieved
    satellite data to answer questions.
    """
    try:
        # Check if services are initialized
        if not vector_store_service.initialized:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Vector database not initialized. Please contact administrator."
            )
        
        if not llm_service.initialized:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="LLM service not initialized. Please check GROQ_API_KEY configuration."
            )
        
        # If specific AOI ID is provided, retrieve only that AOI
        if request.aoi_id:
            logger.info(f"Querying specific AOI: {request.aoi_id}")
            aoi_data = vector_store_service.get_aoi_by_id(request.aoi_id)
            if not aoi_data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"AOI with ID {request.aoi_id} not found"
                )
            retrieved_contexts = [aoi_data]
            retrieved_contexts[0]['similarity'] = 1.0  # Perfect match for specific AOI
        else:
            # Query vector database for similar AOI analyses
            logger.info(f"Searching for relevant AOIs for question: {request.question}")
            retrieved_contexts = vector_store_service.query_similar(
                query_text=request.question,
                top_k=request.top_k,
                min_similarity=0.3
            )
        
        # Generate RAG response using LLM
        try:
            rag_result = llm_service.generate_rag_response(
                user_question=request.question,
                retrieved_contexts=retrieved_contexts
            )
        except Exception as e:
            logger.error(f"Error generating LLM response: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error generating response: {str(e)}"
            )
        
        # Format sources
        sources = [
            SourceInfo(
                aoi_id=source["aoi_id"],
                similarity=source["similarity"],
                date_range=source["date_range"]
            )
            for source in rag_result["sources"]
        ]
        
        # Create response
        response = QueryResponse(
            question=request.question,
            answer=rag_result["answer"],
            sources=sources,
            confidence=rag_result["confidence"],
            context_count=rag_result["context_count"]
        )
        
        logger.info(f"Successfully answered query with {len(sources)} sources")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in query_aoi: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing your query"
        )


@router.get("/stats")
async def get_vector_store_stats():
    """
    Get statistics about the vector store
    
    Returns information about how many AOI analyses are stored
    and available for querying.
    """
    try:
        stats = vector_store_service.get_collection_stats()
        return stats
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving statistics"
        )
