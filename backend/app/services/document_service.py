"""
Document Service - Knowledge Base Management

Handles document upload, processing, and management for the knowledge base.
Uses PostgreSQL for database and local storage for files.
"""

from typing import Any, Dict, List, Optional
import logging
import uuid
from datetime import datetime
from pathlib import Path
import tempfile
import os

from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer

from app.config import settings
from app.core.database import get_db_pool
from app.services.vector_store import vector_store
from app.core.errors import AutoBidderError, VectorStoreError
from app.models.document import Document, DocumentCreate, DocumentUpdate, DocumentStats

logger = logging.getLogger(__name__)


class DocumentService:
    """Service for managing knowledge base documents."""

    def __init__(self) -> None:
        """Initialize document service with embedding model and text splitter."""
        # Use local sentence-transformers for embeddings (works with any LLM provider)
        self.embedding_model = SentenceTransformer(settings.embed_model)
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
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                query = "SELECT * FROM knowledge_base_documents WHERE user_id = $1"
                params = [user_id]
                param_count = 1

                if collection:
                    param_count += 1
                    query += f" AND collection = ${param_count}"
                    params.append(collection)

                if status:
                    param_count += 1
                    query += f" AND processing_status = ${param_count}"
                    params.append(status)

                query += " ORDER BY uploaded_at DESC"

                rows = await conn.fetch(query, *params)

                documents = []
                for row in rows:
                    documents.append(self._row_to_document(dict(row)))

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
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    SELECT * FROM knowledge_base_documents
                    WHERE id = $1 AND user_id = $2
                    """,
                    document_id,
                    user_id
                )

                if not row:
                    raise AutoBidderError(f"Document {document_id} not found")

                return self._row_to_document(dict(row))
        except AutoBidderError:
            raise
        except Exception as e:
            logger.error(f"Failed to get document: {e}")
            raise AutoBidderError(f"Failed to get document: {e}")

    async def upload_document(
        self,
        user_id: str,
        file_content: bytes,
        filename: str,
        collection: str,
        title: Optional[str] = None,
        supplemental_info: Optional[str] = None,
        reference_url: Optional[str] = None,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        contact_url: Optional[str] = None
    ) -> Document:
        """
        Upload and process a document.

        Args:
            user_id: User's UUID
            file_content: File content as bytes
            filename: Original filename
            collection: Collection type (case_studies, team_profiles, etc.)
            title: Document title (defaults to filename without extension)
            supplemental_info: Additional context to embed with document (not stored in DB)
            reference_url: Optional reference URL (company website, etc.)
            email: Optional contact email
            phone: Optional contact phone
            contact_url: Optional contact URL (LinkedIn, etc.)

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

            # Use provided title or default to filename without extension
            doc_title = title or Path(filename).stem

            # Save file to local storage: backend/data/kb/{user_id}/{document_id}.{ext}
            storage_dir = Path(settings.kb_storage_dir) / user_id
            storage_dir.mkdir(parents=True, exist_ok=True)

            file_path = storage_dir / f"{document_id}{file_ext}"
            file_path.write_bytes(file_content)

            # Store relative path for portability
            file_url = f"data/kb/{user_id}/{document_id}{file_ext}"

            # Create document record
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    INSERT INTO knowledge_base_documents
                    (id, user_id, title, filename, file_type, file_size_bytes, file_url,
                     collection, processing_status, reference_url, email, phone, contact_url)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    RETURNING *
                    """,
                    document_id,
                    user_id,
                    doc_title,
                    filename,
                    file_type,
                    file_size,
                    file_url,
                    collection,
                    "pending",
                    reference_url,
                    email,
                    phone,
                    contact_url
                )

                if not row:
                    raise AutoBidderError("Failed to create document record")

                document = self._row_to_document(dict(row))

            # Process document asynchronously (in background)
            # For now, we'll process it immediately, but in production this should be a background task
            try:
                await self._process_document(
                    document_id, user_id, file_content, file_type, collection, supplemental_info
                )
            except Exception as e:
                logger.error(f"Document processing failed: {e}")
                # FR-009: Map to user-friendly error with suggestion
                friendly_msg = self._get_friendly_error_message(e)
                await self._update_document_status(
                    document_id, "failed", friendly_msg
                )

            return document
        except AutoBidderError:
            raise
        except Exception as e:
            logger.error(f"Failed to upload document: {e}")
            raise AutoBidderError(f"Failed to upload document: {e}")

    async def _process_document(
        self, document_id: str, user_id: str, file_content: bytes, file_type: str, collection: str,
        supplemental_info: Optional[str] = None
    ) -> None:
        """
        Process a document: parse, chunk, embed, and store in vector DB.

        Args:
            document_id: Document UUID
            user_id: User's UUID
            file_content: File content as bytes
            file_type: File type (pdf, docx, txt)
            collection: Collection name
            supplemental_info: Additional context to append for embedding
        """
        try:
            # Update status to processing
            await self._update_document_status(document_id, "processing")

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

                # Append supplemental info to the last chunk for embedding
                # This ensures it's searchable but not duplicated across all chunks
                if supplemental_info:
                    supplemental_section = f"\n\n---SUPPLEMENTAL INFO---\n{supplemental_info}"
                    chunk_texts[-1] += supplemental_section

                # Generate embeddings using local sentence-transformers model
                embeddings = self.embedding_model.encode(
                    chunk_texts,
                    convert_to_numpy=True,
                    show_progress_bar=False
                ).tolist()

                # Calculate token count (approximate: 1 token ≈ 4 characters)
                total_chars = sum(len(text) for text in chunk_texts)
                token_count = total_chars // 4

                # Map "other" to general_kb for RAG search compatibility (research.md)
                chroma_collection = "general_kb" if collection == "other" else collection
                # Store in ChromaDB (convert UUIDs to strings)
                await vector_store.add_documents(
                    collection_name=chroma_collection,
                    user_id=str(user_id),
                    document_id=str(document_id),
                    chunks=chunk_texts,
                    embeddings=embeddings,
                )

                # Update document status
                await self._update_document_status(
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

    def _get_friendly_error_message(self, error: Exception) -> str:
        """Map technical errors to user-friendly messages with suggestions (FR-009)."""
        msg = str(error).lower()
        if "pdf" in msg or "parse" in msg or "pypdf" in msg or "corrupt" in msg:
            return (
                "Unable to read this PDF. The file may be corrupted, password-protected, "
                "or in an unsupported format. Try re-exporting as a new PDF or use a different file."
            )
        if "docx" in msg or "doc" in msg or "word" in msg:
            return (
                "Unable to read this Word document. The file may be corrupted or in an old format. "
                "Try saving as .docx (Word 2007+) or exporting to PDF."
            )
        if "embedding" in msg or "encode" in msg:
            return "Document processing failed during analysis. Please try again or use a smaller file."
        if "timeout" in msg or "timed out" in msg:
            return "Processing took too long. Try a smaller file or split your document."
        # Default
        return f"Processing failed: {str(error)[:200]}. Please check the file and try again."

    async def _update_document_status(
        self,
        document_id: str,
        status: str,
        error_message: Optional[str] = None,
        chunk_count: Optional[int] = None,
        token_count: Optional[int] = None,
    ) -> None:
        """
        Update document processing status.

        Args:
            document_id: Document UUID
            status: Processing status
            error_message: Optional error message
            chunk_count: Optional chunk count
            token_count: Optional token count
        """
        try:
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                update_fields = ["processing_status = $2"]
                params = [document_id, status]
                param_count = 2

                if error_message:
                    param_count += 1
                    update_fields.append(f"processing_error = ${param_count}")
                    params.append(error_message)

                if chunk_count is not None:
                    param_count += 1
                    update_fields.append(f"chunk_count = ${param_count}")
                    params.append(chunk_count)

                if token_count is not None:
                    param_count += 1
                    update_fields.append(f"token_count = ${param_count}")
                    params.append(token_count)

                if status == "completed":
                    update_fields.append("processed_at = CURRENT_TIMESTAMP")

                query = f"""
                    UPDATE knowledge_base_documents
                    SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                """

                await conn.execute(query, *params)
        except Exception as e:
            logger.error(f"Failed to update document status: {e}")

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

            # Delete from ChromaDB (convert UUIDs to strings)
            try:
                await vector_store.delete_document(
                    collection_name=document.collection,
                    user_id=str(user_id),
                    document_id=str(document_id),
                )
            except VectorStoreError as e:
                logger.warning(f"Failed to delete from ChromaDB: {e}")

            # Delete from file storage
            if document.file_url:
                try:
                    file_path = Path(settings.backend_root) / document.file_url
                    if file_path.exists():
                        file_path.unlink()
                        logger.info(f"Deleted file: {file_path}")
                except Exception as e:
                    logger.warning(f"Failed to delete file: {e}")

            # Delete from database
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    DELETE FROM knowledge_base_documents
                    WHERE id = $1 AND user_id = $2
                    """,
                    document_id,
                    user_id
                )

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

            # Read file from storage
            if not document.file_url:
                raise AutoBidderError("Document file not found in storage")

            file_path = Path(settings.backend_root) / document.file_url
            if not file_path.exists():
                raise AutoBidderError(f"Document file not found at {file_path}")

            file_content = file_path.read_bytes(), None

            # Delete old embeddings from ChromaDB
            try:
                await vector_store.delete_document(
                    collection_name=document.collection,
                    user_id=str(user_id),
                    document_id=str(document_id),
                )
            except VectorStoreError as e:
                logger.warning(f"Failed to delete old embeddings: {e}")

            # Reprocess document
            await self._process_document(
                document_id, user_id, file_content, document.file_type, document.collection
            )

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
            id=str(row["id"]),
            user_id=str(row["user_id"]),
            title=row.get("title"),
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
            last_retrieved_at=row.get("last_retrieved_at"),
            uploaded_at=row["uploaded_at"],
            processed_at=row.get("processed_at"),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            reference_url=row.get("reference_url"),
            email=row.get("email"),
            phone=row.get("phone"),
            contact_url=row.get("contact_url"),
        )


# Global instance
document_service = DocumentService()
