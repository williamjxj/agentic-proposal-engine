"""
Vector Store Service - ChromaDB Operations

Handles embedding storage and similarity search using ChromaDB.
"""

from typing import Any, Dict, List, Optional
import logging
from pathlib import Path
import chromadb
from chromadb.config import Settings

from app.config import settings as app_settings
from app.core.errors import VectorStoreError

logger = logging.getLogger(__name__)


class VectorStoreService:
    """Service for managing vector embeddings in ChromaDB."""

    def __init__(self) -> None:
        """
        Initialize ChromaDB client.

        Supports two modes:
        1. HTTP Client: If CHROMA_HOST is set, connects to Docker/remote ChromaDB
        2. Persistent Client: Otherwise, uses local file-based storage

        This hybrid approach allows:
        - Development: Local file-based ChromaDB (simple, debuggable)
        - Production: Containerized ChromaDB (scalable, isolated)
        """
        try:
            # Mode 1: HTTP Client (Docker/Remote ChromaDB)
            if app_settings.chroma_host:
                try:
                    self.client = chromadb.HttpClient(
                        host=app_settings.chroma_host,
                        port=app_settings.chroma_port,
                        settings=Settings(
                            anonymized_telemetry=False,
                        ),
                    )
                    logger.info(
                        f"ChromaDB HTTP client connected to "
                        f"{app_settings.chroma_host}:{app_settings.chroma_port}"
                    )
                    self.mode = "http"
                except Exception as http_error:
                    logger.warning(
                        f"Failed to connect to Dockerized ChromaDB: {http_error}. "
                        "Falling back to local persistent mode."
                    )
                    # Fall back to persistent mode
                    app_settings.chroma_host = None

            # Mode 2: Persistent Client (Local File-Based)
            if not app_settings.chroma_host:
                persist_path = Path(app_settings.chroma_persist_dir)
                persist_path.mkdir(parents=True, exist_ok=True)

                self.client = chromadb.PersistentClient(
                    path=str(persist_path),
                    settings=Settings(
                        anonymized_telemetry=False,
                        allow_reset=True,
                    ),
                )
                logger.info(f"ChromaDB PersistentClient initialized at {persist_path}")
                self.mode = "persistent"

        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {e}")
            raise VectorStoreError(f"ChromaDB initialization failed: {e}")

    def get_or_create_collection(
        self, collection_name: str, user_id: str
    ) -> chromadb.Collection:
        """
        Get or create a collection for a user.

        Args:
            collection_name: Base collection name (e.g., 'case_studies')
            user_id: User's UUID

        Returns:
            ChromaDB collection instance
        """
        try:
            # Namespace collections by user_id
            full_name = f"{collection_name}_{user_id}"

            collection = self.client.get_or_create_collection(
                name=full_name,
                metadata={"user_id": user_id, "type": collection_name},
            )

            logger.debug(f"Retrieved collection: {full_name}")
            return collection
        except Exception as e:
            logger.error(f"Failed to get/create collection: {e}")
            raise VectorStoreError(f"Collection operation failed: {e}")

    async def add_documents(
        self,
        collection_name: str,
        user_id: str,
        document_id: str,
        chunks: List[str],
        embeddings: List[List[float]],
        metadatas: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        """
        Add document chunks with embeddings to collection.

        Args:
            collection_name: Collection type (case_studies, team_profiles, etc.)
            user_id: User's UUID
            document_id: Document UUID
            chunks: List of text chunks
            embeddings: List of embedding vectors
            metadatas: Optional list of metadata dicts for each chunk

        Raises:
            VectorStoreError: If addition fails
        """
        try:
            collection = self.get_or_create_collection(collection_name, user_id)

            # Generate IDs for chunks
            ids = [f"{document_id}_chunk_{i}" for i in range(len(chunks))]

            # Add default metadata if not provided
            # Convert UUIDs to strings for ChromaDB compatibility
            if metadatas is None:
                metadatas = [
                    {
                        "document_id": str(document_id),
                        "user_id": str(user_id),
                        "chunk_index": i,
                        "collection": collection_name,
                    }
                    for i in range(len(chunks))
                ]
            else:
                # Ensure all metadata values are ChromaDB-compatible types
                metadatas = [
                    {k: str(v) if not isinstance(v, (str, int, float, bool)) else v
                     for k, v in metadata.items()}
                    for metadata in metadatas
                ]

            # Add to ChromaDB
            collection.add(
                ids=ids,
                embeddings=embeddings,
                documents=chunks,
                metadatas=metadatas,
            )

            logger.info(f"Added {len(chunks)} chunks to {collection_name} for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to add documents: {e}")
            raise VectorStoreError(f"Failed to add documents: {e}")

    async def similarity_search(
        self,
        collection_name: str,
        user_id: str,
        query_embedding: List[float],
        top_k: int = 5,
        filter_metadata: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search for similar documents using embedding.

        Args:
            collection_name: Collection type
            user_id: User's UUID
            query_embedding: Query embedding vector
            top_k: Number of results to return
            filter_metadata: Optional metadata filters

        Returns:
            List of similar documents with distances and metadata
        """
        try:
            collection = self.get_or_create_collection(collection_name, user_id)

            # Query ChromaDB
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=filter_metadata,
            )

            # Format results
            formatted_results = []
            if results["ids"] and len(results["ids"]) > 0:
                for i in range(len(results["ids"][0])):
                    formatted_results.append(
                        {
                            "id": results["ids"][0][i],
                            "document": results["documents"][0][i],
                            "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                            "distance": results["distances"][0][i] if results["distances"] else None,
                        }
                    )

            logger.info(f"Found {len(formatted_results)} similar documents")
            return formatted_results
        except Exception as e:
            logger.error(f"Similarity search failed: {e}")
            raise VectorStoreError(f"Similarity search failed: {e}")

    async def delete_document(self, collection_name: str, user_id: str, document_id: str) -> None:
        """
        Delete all chunks for a document.

        Args:
            collection_name: Collection type
            user_id: User's UUID
            document_id: Document UUID
        """
        try:
            collection = self.get_or_create_collection(collection_name, user_id)

            # Delete all chunks with matching document_id (convert to string for ChromaDB)
            collection.delete(where={"document_id": str(document_id)})

            logger.info(f"Deleted document {document_id} from {collection_name}")
        except Exception as e:
            logger.error(f"Failed to delete document: {e}")
            raise VectorStoreError(f"Failed to delete document: {e}")

    async def get_collection_stats(self, collection_name: str, user_id: str) -> Dict[str, Any]:
        """
        Get statistics about a collection.

        Args:
            collection_name: Collection type
            user_id: User's UUID

        Returns:
            Dict with count and other stats
        """
        try:
            collection = self.get_or_create_collection(collection_name, user_id)

            count = collection.count()

            return {
                "collection_name": collection_name,
                "user_id": user_id,
                "document_count": count,
            }
        except Exception as e:
            logger.error(f"Failed to get collection stats: {e}")
            return {"collection_name": collection_name, "user_id": user_id, "document_count": 0}


# Global instance
vector_store = VectorStoreService()
