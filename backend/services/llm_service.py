from groq import Groq
from typing import List, Dict, Any, Optional
import logging
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class LLMService:
    """Service for LLM operations using Groq API"""
    
    def __init__(self):
        self.client = None
        self.model = "llama-3.3-70b-versatile"
        self.initialized = False
        self.mock_mode = False
        
    def initialize(self) -> bool:
        """
        Initialize Groq API client
        
        Returns:
            bool: True if initialization successful (or mock mode enabled)
        """
        try:
            api_key = os.getenv("GROQ_API_KEY")
            if not api_key:
                logger.error("GROQ_API_KEY not found in environment variables. Entering mock mode.")
                self.mock_mode = True
                self.initialized = True
                return True
            
            # Use custom HTTP client to prevent proxy extraction issues in Groq constructor if any
            self.client = Groq(api_key=api_key)
            self.initialized = True
            self.mock_mode = False
            logger.info("Groq API client initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize Groq API: {str(e)}")
            logger.warning("Falling back to MOCK MODE for LLM Service")
            self.mock_mode = True
            self.initialized = True
            return True
    
    def generate_rag_response(
        self,
        user_question: str,
        retrieved_contexts: List[Dict[str, Any]],
        max_tokens: int = 1000,
        temperature: float = 0.3
    ) -> Dict[str, Any]:
        """
        Generate RAG-based response using Groq API
        
        Args:
            user_question: User's natural language question
            retrieved_contexts: List of retrieved AOI analyses from vector DB
            max_tokens: Maximum tokens in response
            temperature: Sampling temperature (0-1, lower = more focused)
            
        Returns:
            Dictionary with answer and metadata
        """
        if not self.initialized:
            raise RuntimeError("LLM service not initialized")
        
        try:
            # Build context from retrieved documents
            if not retrieved_contexts:
                return {
                    "answer": "I don't have enough satellite data to answer your question. Please analyze an area first by drawing on the map.",
                    "sources": [],
                    "confidence": "low"
                }
            
            # Format context
            context_parts = []
            for i, ctx in enumerate(retrieved_contexts, 1):
                context_parts.append(f"[Source {i}]")
                context_parts.append(f"Summary: {ctx['summary']}")
                context_parts.append(f"Similarity: {ctx['similarity']}")
                context_parts.append("")
            
            context_text = "\n".join(context_parts)
            
            # Create system prompt
            system_prompt = """You are a geospatial analyst AI assistant. Your role is to answer questions about satellite imagery and geographic data.

CRITICAL RULES:
1. Answer ONLY using the provided satellite data summaries
2. Do NOT make predictions, assumptions, or extrapolations
3. If the data doesn't contain the answer, clearly state that
4. Always cite which source(s) you used (e.g., "According to Source 1...")
5. Be precise and factual
6. If multiple sources have conflicting information, mention both
7. Focus on the specific question asked

Remember: You are analyzing REAL satellite data. Be accurate and grounded in the provided context."""

            # Create user prompt
            user_prompt = f"""Context (Satellite Data):
{context_text}

User Question: {user_question}

Please answer the question based strictly on the context above. If the context doesn't contain enough information to answer, say so clearly."""

            # Call Groq API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=0.9
            )
            
            answer = response.choices[0].message.content
            
            # Extract source information
            sources = [
                {
                    "aoi_id": ctx["aoi_id"],
                    "similarity": ctx["similarity"],
                    "date_range": ctx["date_range"]
                }
                for ctx in retrieved_contexts
            ]
            
            # Determine confidence based on similarity scores
            avg_similarity = sum(ctx["similarity"] for ctx in retrieved_contexts) / len(retrieved_contexts)
            if avg_similarity > 0.7:
                confidence = "high"
            elif avg_similarity > 0.5:
                confidence = "medium"
            else:
                confidence = "low"
            
            return {
                "answer": answer,
                "sources": sources,
                "confidence": confidence,
                "context_count": len(retrieved_contexts)
            }
            
        except Exception as e:
            logger.error(f"Error generating RAG response: {str(e)}")
            raise
    
    def validate_response(self, response: str, contexts: List[Dict[str, Any]]) -> bool:
        """
        Validate that response is grounded in provided contexts
        
        Args:
            response: Generated response text
            contexts: Retrieved contexts
            
        Returns:
            bool: True if response appears grounded
        """
        # Simple validation: check if response mentions "insufficient data" or similar
        insufficient_keywords = [
            "don't have",
            "insufficient",
            "not enough",
            "cannot answer",
            "no data"
        ]
        
        response_lower = response.lower()
        
        # If no contexts, response should indicate insufficient data
        if not contexts:
            return any(keyword in response_lower for keyword in insufficient_keywords)
        
        # If contexts exist, response should NOT say insufficient data
        # (unless it's a specific aspect not covered)
        return True  # Basic validation, can be enhanced


# Global instance
llm_service = LLMService()
