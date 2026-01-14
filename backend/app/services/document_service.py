"""
Document Service - Knowledge Base Management

Handles document upload, processing, and management for the knowledge base.
"""

from typing import Any, Dict, List, Optional
import logging
import uuid
from datetime import datetime
from pathlib import Path
import tempfile
import os

from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from openai import OpenAI

from app.config import settings
from app.services.supabase_client import supabase_service
from app.services.vector_store import vector_store
from app.core.errors import AutoBidderError, VectorStoreError
from app.models.document import Document, DocumentCreate, DocumentUpdate, DocumentStats

logger = logging.getLogger(__name__)


class DocumentService:
    """Service for managing knowledge base documents."""

    def __init__(self) -> None:
        """Initialize document service with OpenAI client and text splitter."""
        self.openai_client = OpenAI(api_key=settings.openai_api_key)
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

    async def list_documents(
        self, user_id: str, collection: Optional[str] = None, status: Optional[str] = None
    ) -> List[Document]:
        """
        List documents for a user with optional filters.

        Args:
            user_id: User's UUID
            collection: Optional collection filter
            status: Optional processing status filter

        Returns:
            List of Document objects

        Raises:
            AutoBidderError: If query fails
        """
        try:
            query = supabase_service.client.table("knowledge_base_documents").select("*").eq(
                "user_id", user_id
            )

            if collection:
                query = query.eq("collection", collection)
            if status:
                query = query.eq("processing_status", status)

            response = query.order("uploaded_at", desc=True).execute()

            documents = []
            for row in response.data:
                documents.append(self._row_to_document(row))

            return documents
        except Exception as e:
            logger.error(f"Failed to list documents: {e}")
            raise AutoBidderError(f"Failed to list documents: {e}")

    async def get_document(self, document_id: str, user_id: str) -> Document:
        """
        Get a single document by ID.

        Args:
            document_id: Document UUID
            user_id: User's UUID (for authorization)

        Returns:
            Document object

        Raises:
            AutoBidderError: If document not found or access denied
        """
        try:
            response = (
                supabase_service.client.table("knowledge_base_documents")
                .select("*")
                .eq("id", document_id)
                .eq("user_id", user_id)
                .execute()
            )

            if not response.data or len(response.data) == 0:
                raise AutoBidderError(f"Document {document_id} not found")

            return self._row_to_document(response.data[0])
        except AutoBidderError:
            raise
        except Exception as e:
            logger.error(f"Failed to get document: {e}")
            raise AutoBidderError(f"Failed to get document: {e}")

    async def upload_document(
        self, user_id: str, file_content: bytes, filename: str, collection: str
    ) -> Document:
        """
        Upload and process a document.

        Args:
            user_id: User's UUID
            file_content: File content as bytes
            filename: Original filename
            collection: Collection type (case_studies, team_profiles, etc.)

        Returns:
            Created Document object

        Raises:
            AutoBidderError: If upload or processing fails
        """
        try:
            # Validate file size
            file_size = len(file_content)
            if file_size > settings.max_file_size_bytes:
                raise AutoBidderError(
                    f"File size {file_size} exceeds maximum {settings.max_file_size_bytes} bytes"
                )

            # Determine file type
            file_ext = Path(filename).suffix.lower()
            if file_ext == ".pdf":
                file_type = "pdf"
            elif file_ext in [".doc", ".docx"]:
                file_type = "docx"
            elif file_ext == ".txt":
                file_type = "txt"
            else:
                raise AutoBidderError(f"Unsupported file type: {file_ext}")

            # Generate document ID
            document_id = str(uuid.uuid4())

            # Upload to Supabase Storage (if configured)
            file_url = None
            try:
                # Store in knowledge-base bucket
                storage_path = f"{user_id}/{document_id}/{filename}"
                supabase_service.client.storage.from_("knowledge-base").upload(
                    storage_path, file_content, file_options={"content-type": f"application/{file_type}"}
                )
                # Get public URL
                file_url = supabase_service.client.storage.from_("knowledge-base").get_public_url(
                    storage_path
                )
            except Exception as e:
                logger.warning(f"Failed to upload to Supabase Storage: {e}")
                # Continue without storage URL

            # Create document record
            document_data: Dict[str, Any] = {
                "id": document_id,
                "user_id": user_id,
                "filename": filename,
                "file_type": file_type,
                "file_size_bytes": file_size,
                "file_url": file_url,
                "collection": collection,
                "processing_status": "pending",
            }

            response = (
                supabase_service.client.table("knowledge_base_documents")
                .insert(document_data)
                .execute()
            )

            if not response.data:
                raise AutoBidderError("Failed to create document record")

            document = self._row_to_document(response.data[0])

            # Process document asynchronously (in background)
            # For now, we'll process it immediately, but in production this should be a background task
            try:
                await self._process_document(document_id, user_id, file_content, file_type, collection)
            except Exception as e:
                logger.error(f"Document processing failed: {e}")
                # Update status to failed
                await supabase_service.update_document_status(
                    document_id, "failed", str(e)
                )

            return document
        except AutoBidderError:
            raise
        except Exception as e:
            logger.error(f"Failed to upload document: {e}")
            raise AutoBidderError(f"Failed to upload document: {e}")

    async def _process_document(
        self, document_id: str, user_id: str, file_content: bytes, file_type: str, collection: str
    ) -> None:
        """
        Process a document: parse, chunk, embed, and store in vector DB.

        Args:
            document_id: Document UUID
            user_id: User's UUID
            file_content: File content as bytes
            file_type: File type (pdf, docx, txt)
            collection: Collection name
        """
        try:
            # Update status to processing
            await supabase_service.update_document_status(document_id, "processing")

            # Save file to temporary location
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_type}") as tmp_file:
                tmp_file.write(file_content)
                tmp_path = tmp_file.name

            try:
                # Load document based on type
                if file_type == "pdf":
                    loader = PyPDFLoader(tmp_path)
                elif file_type == "docx":
                    loader = Docx2txtLoader(tmp_path)
                elif file_type == "txt":
                    loader = TextLoader(tmp_path)
                else:
                    raise ValueError(f"Unsupported file type: {file_type}")

                documents = loader.load()

                # Chunk documents
                chunks = self.text_splitter.split_documents(documents)
                chunk_texts = [chunk.page_content for chunk in chunks]

                if not chunk_texts:
                    raise AutoBidderError("No text content extracted from document")

                # Generate embeddings
                embeddings_response = self.openai_client.embeddings.create(
                    model=settings.openai_embedding_model,
                    input=chunk_texts,
                )
                embeddings = [item.embedding for item in embeddings_response.data]

                # Calculate token count (approximate: 1 token ≈ 4 characters)
                total_chars = sum(len(text) for text in chunk_texts)
                token_count = total_chars // 4

                # Store in ChromaDB
                await vector_store.add_documents(
                    collection_name=collection,
                    user_id=user_id,
                    document_id=document_id,
                    chunks=chunk_texts,
                    embeddings=embeddings,
                )

                # Update document status
                await supabase_service.update_document_status(
                    document_id,
                    "completed",
                    chunk_count=len(chunks),
                    token_count=token_count,
                )

                logger.info(
                    f"Processed document {document_id}: {len(chunks)} chunks, {token_count} tokens"
                )
            finally:
                # Clean up temporary file
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)

        except Exception as e:
            logger.error(f"Document processing error: {e}")
            raise

    async def delete_document(self, document_id: str, user_id: str) -> None:
        """
        Delete a document and its embeddings.

        Args:
            document_id: Document UUID
            user_id: User's UUID (for authorization)

        Raises:
            AutoBidderError: If deletion fails
        """
        try:
            # Get document to find collection
            document = await self.get_document(document_id, user_id)

            # Delete from ChromaDB
            try:
                await vector_store.delete_document(
                    collection_name=document.collection,
                    user_id=user_id,
                    document_id=document_id,
                )
            except VectorStoreError as e:
                logger.warning(f"Failed to delete from ChromaDB: {e}")

            # Delete from Supabase Storage (if exists)
            if document.file_url:
                try:
                    storage_path = f"{user_id}/{document_id}/{document.filename}"
                    supabase_service.client.storage.from_("knowledge-base").remove([storage_path])
                except Exception as e:
                    logger.warning(f"Failed to delete from storage: {e}")

            # Delete from database
            supabase_service.client.table("knowledge_base_documents").delete().eq(
                "id", document_id
            ).eq("user_id", user_id).execute()

            logger.info(f"Deleted document {document_id}")
        except AutoBidderError:
            raise
        except Exception as e:
            logger.error(f"Failed to delete document: {e}")
            raise AutoBidderError(f"Failed to delete document: {e}")

    async def reprocess_document(self, document_id: str, user_id: str) -> None:
        """
        Reprocess a document (re-chunk and re-embed).

        Args:
            document_id: Document UUID
            user_id: User's UUID (for authorization)

        Raises:
            AutoBidderError: If reprocessing fails
        """
        try:
            document = await self.get_document(document_id, user_id)

            # Download file from storage
            if not document.file_url:
                raise AutoBidderError("Document file not available for reprocessing")

            # Download file content
            storage_path = f"{user_id}/{document_id}/{document.filename}"
            file_content = supabase_service.client.storage.from_("knowledge-base").download(
                storage_path
            )

            # Delete old embeddings
            try:
                await vector_store.delete_document(
                    collection_name=document.collection,
                    user_id=user_id,
                    document_id=document_id,
                )
            except VectorStoreError as e:
                logger.warning(f"Failed to delete old embeddings: {e}")

            # Reprocess
            await self._process_document(
                document_id, user_id, file_content, document.file_type, document.collection
            )

            logger.info(f"Reprocessed document {document_id}")
        except AutoBidderError:
            raise
        except Exception as e:
            logger.error(f"Failed to reprocess document: {e}")
            raise AutoBidderError(f"Failed to reprocess document: {e}")

    async def get_document_stats(self, document_id: str, user_id: str) -> DocumentStats:
        """
        Get statistics for a document.

        Args:
            document_id: Document UUID
            user_id: User's UUID (for authorization)

        Returns:
            DocumentStats object

        Raises:
            AutoBidderError: If document not found
        """
        try:
            document = await self.get_document(document_id, user_id)

            return DocumentStats(
                document_id=document_id,
                chunk_count=document.chunk_count,
                token_count=document.token_count,
                retrieval_count=document.retrieval_count,
                last_retrieved_at=document.last_retrieved_at,
                processing_status=document.processing_status,
            )
        except AutoBidderError:
            raise
        except Exception as e:
            logger.error(f"Failed to get document stats: {e}")
            raise AutoBidderError(f"Failed to get document stats: {e}")

    def _row_to_document(self, row: Dict[str, Any]) -> Document:
        """Convert database row to Document model."""
        return Document(
            id=row["id"],
            user_id=row["user_id"],
            filename=row["filename"],
            file_type=row["file_type"],
            file_size_bytes=row["file_size_bytes"],
            file_url=row.get("file_url"),
            collection=row["collection"],
            processing_status=row["processing_status"],
            processing_error=row.get("processing_error"),
            chunk_count=row.get("chunk_count", 0),
            token_count=row.get("token_count", 0),
            embedding_model=row.get("embedding_model"),
            chroma_collection_name=row.get("chroma_collection_name"),
            retrieval_count=row.get("retrieval_count", 0),
            last_retrieved_at=datetime.fromisoformat(row["last_retrieved_at"].replace("Z", "+00:00"))
            if row.get("last_retrieved_at")
            else None,
            uploaded_at=datetime.fromisoformat(row["uploaded_at"].replace("Z", "+00:00")),
            processed_at=datetime.fromisoformat(row["processed_at"].replace("Z", "+00:00"))
            if row.get("processed_at")
            else None,
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")),
            updated_at=datetime.fromisoformat(row["updated_at"].replace("Z", "+00:00")),
        )


# Global instance
document_service = DocumentService()
