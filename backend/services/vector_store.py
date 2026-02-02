import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any, Optional
import logging
import os
import json
import pickle

logger = logging.getLogger(__name__)


class VectorStoreService:
    """Service for managing vector database operations using FAISS"""
    
    def __init__(self, persist_directory: str = "./faiss_db"):
        """
        Initialize Vector Store Service
        
        Args:
            persist_directory: Directory to persist FAISS data
        """
        self.persist_directory = persist_directory
        self.index = None
        self.metadata_store = {}  # Store metadata separately
        self.embedding_model = None
        self.initialized = False
        self.dimension = 384  # Dimension for all-MiniLM-L6-v2
        
        # Create persist directory if it doesn't exist
        os.makedirs(persist_directory, exist_ok=True)
        
    def initialize(self) -> bool:
        """
        Initialize FAISS index and embedding model
        
        Returns:
            bool: True if initialization successful
        """
        try:
            # Load sentence transformer model
            logger.info("Loading sentence-transformers model...")
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            
            # Try to load existing index
            index_path = os.path.join(self.persist_directory, "index.faiss")
            metadata_path = os.path.join(self.persist_directory, "metadata.pkl")
            
            if os.path.exists(index_path) and os.path.exists(metadata_path):
                logger.info("Loading existing FAISS index...")
                self.index = faiss.read_index(index_path)
                with open(metadata_path, 'rb') as f:
                    self.metadata_store = pickle.load(f)
                logger.info(f"Loaded existing index with {self.index.ntotal} vectors")
            else:
                # Create new index (using L2 distance)
                logger.info("Creating new FAISS index...")
                self.index = faiss.IndexFlatL2(self.dimension)
                self.metadata_store = {}
            
            self.initialized = True
            logger.info(f"Vector store initialized successfully with {self.index.ntotal} existing documents")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize vector store: {str(e)}")
            self.initialized = False
            return False
    
    def _save_index(self):
        """Save FAISS index and metadata to disk"""
        try:
            index_path = os.path.join(self.persist_directory, "index.faiss")
            metadata_path = os.path.join(self.persist_directory, "metadata.pkl")
            
            faiss.write_index(self.index, index_path)
            with open(metadata_path, 'wb') as f:
                pickle.dump(self.metadata_store, f)
            
            logger.debug("Saved FAISS index and metadata")
        except Exception as e:
            logger.error(f"Error saving index: {str(e)}")
    
    def create_embeddings(self, texts: List[str]) -> np.ndarray:
        """
        Create embeddings for a list of texts
        
        Args:
            texts: List of text strings to embed
            
        Returns:
            numpy array of embedding vectors
        """
        if not self.initialized or not self.embedding_model:
            raise RuntimeError("Vector store not initialized")
        
        embeddings = self.embedding_model.encode(texts, convert_to_numpy=True)
        return embeddings
    
    def add_aoi_analysis(
        self,
        aoi_id: str,
        summaries: List[str],
        metrics: Dict[str, Any],
        coordinates: Dict[str, Any],
        date_range: Dict[str, str]
    ) -> bool:
        """
        Add AOI analysis to vector store
        
        Args:
            aoi_id: Unique identifier for the AOI
            summaries: List of textual summaries
            metrics: Dictionary of computed metrics
            coordinates: GeoJSON coordinates
            date_range: Date range dictionary with start and end
            
        Returns:
            bool: True if successful
        """
        if not self.initialized:
            raise RuntimeError("Vector store not initialized")
        
        try:
            # Combine summaries into a single document
            combined_summary = " ".join(summaries)
            
            # Create embedding
            embedding = self.create_embeddings([combined_summary])[0]
            
            # Add to FAISS index
            self.index.add(np.array([embedding], dtype=np.float32))
            
            # Store metadata (use index position as key)
            idx = self.index.ntotal - 1
            self.metadata_store[idx] = {
                "aoi_id": aoi_id,
                "summary": combined_summary,
                "coordinates": coordinates,
                "date_range": date_range,
                "metrics": metrics,
                "summary_count": len(summaries)
            }
            
            # Save to disk
            self._save_index()
            
            logger.info(f"Successfully added AOI {aoi_id} to vector store (index: {idx})")
            return True
            
        except Exception as e:
            logger.error(f"Error adding AOI to vector store: {str(e)}")
            return False
    
    def query_similar(
        self,
        query_text: str,
        top_k: int = 5,
        min_similarity: float = 0.3
    ) -> List[Dict[str, Any]]:
        """
        Query vector store for similar AOI analyses
        
        Args:
            query_text: User's natural language question
            top_k: Number of results to return
            min_similarity: Minimum similarity threshold (0-1)
            
        Returns:
            List of relevant AOI analyses with metadata
        """
        if not self.initialized:
            raise RuntimeError("Vector store not initialized")
        
        try:
            if self.index.ntotal == 0:
                logger.info("No documents in vector store")
                return []
            
            # Create query embedding
            query_embedding = self.create_embeddings([query_text])[0]
            
            # Search in FAISS
            k = min(top_k, self.index.ntotal)
            distances, indices = self.index.search(
                np.array([query_embedding], dtype=np.float32), 
                k
            )
            
            # Process results
            relevant_results = []
            
            for i, idx in enumerate(indices[0]):
                if idx == -1:  # FAISS returns -1 for empty results
                    continue
                
                distance = distances[0][i]
                # Convert L2 distance to similarity (inverse relationship)
                # Normalize: similarity = 1 / (1 + distance)
                similarity = 1 / (1 + distance)
                
                # Filter by minimum similarity
                if similarity >= min_similarity:
                    metadata = self.metadata_store.get(int(idx), {})
                    if metadata:
                        relevant_results.append({
                            "aoi_id": metadata.get("aoi_id"),
                            "summary": metadata.get("summary"),
                            "similarity": round(similarity, 3),
                            "metrics": metadata.get("metrics", {}),
                            "coordinates": metadata.get("coordinates", {}),
                            "date_range": metadata.get("date_range", {})
                        })
            
            logger.info(f"Found {len(relevant_results)} relevant results for query")
            return relevant_results
            
        except Exception as e:
            logger.error(f"Error querying vector store: {str(e)}")
            return []
    
    def get_aoi_by_id(self, aoi_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a specific AOI analysis by ID
        
        Args:
            aoi_id: AOI identifier
            
        Returns:
            AOI analysis data or None if not found
        """
        if not self.initialized:
            raise RuntimeError("Vector store not initialized")
        
        try:
            # Search through metadata
            for idx, metadata in self.metadata_store.items():
                if metadata.get("aoi_id") == aoi_id:
                    return {
                        "aoi_id": aoi_id,
                        "summary": metadata.get("summary"),
                        "metrics": metadata.get("metrics", {}),
                        "coordinates": metadata.get("coordinates", {}),
                        "date_range": metadata.get("date_range", {})
                    }
            return None
            
        except Exception as e:
            logger.error(f"Error retrieving AOI {aoi_id}: {str(e)}")
            return None
    
    def delete_aoi(self, aoi_id: str) -> bool:
        """
        Delete an AOI analysis from vector store
        Note: FAISS doesn't support deletion, so we just remove from metadata
        
        Args:
            aoi_id: AOI identifier
            
        Returns:
            bool: True if successful
        """
        if not self.initialized:
            raise RuntimeError("Vector store not initialized")
        
        try:
            # Find and remove from metadata
            for idx, metadata in list(self.metadata_store.items()):
                if metadata.get("aoi_id") == aoi_id:
                    del self.metadata_store[idx]
                    self._save_index()
                    logger.info(f"Deleted AOI {aoi_id} from metadata")
                    return True
            return False
        except Exception as e:
            logger.error(f"Error deleting AOI {aoi_id}: {str(e)}")
            return False
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the vector store collection
        
        Returns:
            Dictionary with collection statistics
        """
        if not self.initialized:
            return {"initialized": False}
        
        try:
            return {
                "initialized": True,
                "total_documents": self.index.ntotal,
                "dimension": self.dimension,
                "backend": "FAISS"
            }
        except Exception as e:
            logger.error(f"Error getting collection stats: {str(e)}")
            return {"initialized": True, "error": str(e)}


# Global instance
vector_store_service = VectorStoreService()

