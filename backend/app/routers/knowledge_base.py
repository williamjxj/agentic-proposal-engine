"""
Knowledge Base Router

API endpoints for managing knowledge base documents.
"""

from typing import List, Optional
import logging
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.services.document_service import document_service
from app.models.document import Document, DocumentStats
from app.core.errors import AutoBidderError

logger = logging.getLogger(__name__)

router = APIRouter()
security = HTTPBearer()


async def get_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Extract user_id from JWT token.

    In production, this should validate the JWT and extract user_id.
    For now, we'll use a simple header-based approach.
    """
    # TODO: Implement proper JWT validation
    # For now, we'll use a header-based approach
    # In production, decode JWT and extract user_id
    return credentials.credentials if credentials else "default-user"


@router.get("/documents", response_model=List[Document], tags=["knowledge-base"])
async def list_documents(
    collection: Optional[str] = Query(None, description="Filter by collection"),
    status: Optional[str] = Query(None, description="Filter by processing status"),
    user_id: str = Depends(get_user_id),
) -> List[Document]:
    """
    List all documents for the authenticated user.

    Args:
        collection: Optional collection filter
        status: Optional processing status filter
        user_id: Authenticated user ID

    Returns:
        List of documents
    """
    try:
        return await document_service.list_documents(
            user_id=user_id, collection=collection, status=status
        )
    except AutoBidderError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/documents/{document_id}", response_model=Document, tags=["knowledge-base"])
async def get_document(document_id: str, user_id: str = Depends(get_user_id)) -> Document:
    """
    Get a single document by ID.

    Args:
        document_id: Document UUID
        user_id: Authenticated user ID

    Returns:
        Document object
    """
    try:
        return await document_service.get_document(document_id, user_id)
    except AutoBidderError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/documents/upload", response_model=Document, tags=["knowledge-base"])
async def upload_document(
    file: UploadFile = File(...),
    collection: str = Query(..., description="Collection type (case_studies, team_profiles, etc.)"),
    user_id: str = Depends(get_user_id),
) -> Document:
    """
    Upload a new document.

    Args:
        file: File to upload
        collection: Collection type
        user_id: Authenticated user ID

    Returns:
        Created document object
    """
    try:
        # Validate collection
        allowed_collections = ["case_studies", "team_profiles", "portfolio", "other"]
        if collection not in allowed_collections:
            raise HTTPException(
                status_code=400, detail=f"Collection must be one of {allowed_collections}"
            )

        # Read file content
        file_content = await file.read()

        # Upload and process
        document = await document_service.upload_document(
            user_id=user_id,
            file_content=file_content,
            filename=file.filename or "unknown",
            collection=collection,
        )

        return document
    except HTTPException:
        raise
    except AutoBidderError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/documents/{document_id}", tags=["knowledge-base"])
async def delete_document(document_id: str, user_id: str = Depends(get_user_id)) -> dict:
    """
    Delete a document.

    Args:
        document_id: Document UUID
        user_id: Authenticated user ID

    Returns:
        Success message
    """
    try:
        await document_service.delete_document(document_id, user_id)
        return {"message": "Document deleted successfully"}
    except AutoBidderError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/documents/{document_id}/reprocess", tags=["knowledge-base"])
async def reprocess_document(document_id: str, user_id: str = Depends(get_user_id)) -> dict:
    """
    Reprocess a document (re-chunk and re-embed).

    Args:
        document_id: Document UUID
        user_id: Authenticated user ID

    Returns:
        Success message
    """
    try:
        await document_service.reprocess_document(document_id, user_id)
        return {"message": "Document reprocessing started"}
    except AutoBidderError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error reprocessing document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/documents/{document_id}/stats", response_model=DocumentStats, tags=["knowledge-base"])
async def get_document_stats(document_id: str, user_id: str = Depends(get_user_id)) -> DocumentStats:
    """
    Get statistics for a document.

    Args:
        document_id: Document UUID
        user_id: Authenticated user ID

    Returns:
        Document statistics
    """
    try:
        return await document_service.get_document_stats(document_id, user_id)
    except AutoBidderError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting document stats: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
