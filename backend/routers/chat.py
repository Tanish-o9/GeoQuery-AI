from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from services.langgraph_agent import gis_agent
from services.postgis_db import db_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])

class ChatMessageRequest(BaseModel):
    message: str = Field(..., description="User message to the GIS agent")
    session_id: str = Field("default_session", description="Conversation session identifier")

class MapCommandResponse(BaseModel):
    action: str
    target: Optional[List[float]] = None
    zoom: Optional[int] = None
    layer: Optional[str] = None
    visible: Optional[bool] = None
    opacity: Optional[float] = None
    geometry: Optional[Dict[str, Any]] = None
    color: Optional[str] = None
    popup: Optional[str] = None

class ChatMessageResponse(BaseModel):
    answer: str
    commands: List[Dict[str, Any]]
    reasoning: List[str]

class ChatHistoryItem(BaseModel):
    role: str
    content: str
    commands: List[Dict[str, Any]]
    reasoning: str
    created_at: str

@router.post("/message", response_model=ChatMessageResponse)
async def send_chat_message(request: ChatMessageRequest):
    """
    Send a message to the LangGraph GIS assistant.
    Executes intent classification, spatial queries, and generates map updates.
    """
    try:
        logger.info(f"Processing chat message for session {request.session_id}")
        result = gis_agent.run_agent(
            session_id=request.session_id,
            user_message=request.message
        )
        return ChatMessageResponse(
            answer=result["answer"],
            commands=result["commands"],
            reasoning=result["reasoning"]
        )
    except Exception as e:
        logger.error(f"Error in send_chat_message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing agent: {str(e)}"
        )

@router.get("/history/{session_id}", response_model=List[ChatHistoryItem])
async def get_chat_history(session_id: str):
    """Retrieve chat history for a session"""
    try:
        history = db_service.get_chat_history(session_id)
        return [
            ChatHistoryItem(
                role=item["role"],
                content=item["content"],
                commands=item["commands"],
                reasoning=item["reasoning"],
                created_at=item["created_at"]
            )
            for item in history
        ]
    except Exception as e:
        logger.error(f"Error getting chat history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving chat history"
        )
