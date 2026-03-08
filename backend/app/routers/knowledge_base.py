"""
Knowledge Base Router

API endpoints for managing knowledge base documents.
"""

from typing import List, Optional
import logging
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query

from app.services.document_service import document_service
from app.models.document import Document, DocumentStats
from app.models.auth import UserResponse
from app.core.errors import AutoBidderError
from app.routers.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/documents", response_model=List[Document], tags=["knowledge-base"])
async def list_documents(
    collection: Optional[str] = Query(None, description="Filter by collection"),
    status: Optional[str] = Query(None, description="Filter by processing status"),
    current_user: UserResponse = Depends(get_current_user),
) -> List[Document]:
    """
    List all documents for the authenticated user.

    Args:
        collection: Optional collection filter
        status: Optional processing status filter
        current_user: Authenticated user from JWT token

    Returns:
        List of documents
    """
    try:
        user_id = current_user.id
        return await document_service.list_documents(
            user_id=user_id, collection=collection, status=status
        )
    except AutoBidderError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/documents/{document_id}", response_model=Document, tags=["knowledge-base"])
async def get_document(document_id: str, current_user: UserResponse = Depends(get_current_user)) -> Document:
    """
    Get a single document by ID.

    Args:
        document_id: Document UUID
        current_user: Authenticated user from JWT token

    Returns:
        Document object
    """
    try:
        user_id = current_user.id
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
    title: Optional[str] = Query(None, max_length=200, description="Document title"),
    supplemental_info: Optional[str] = Query(None, description="Additional context to embed with document"),
    reference_url: Optional[str] = Query(None, description="Optional reference URL (company website, etc.)"),
    email: Optional[str] = Query(None, description="Optional contact email"),
    phone: Optional[str] = Query(None, description="Optional contact phone"),
    contact_url: Optional[str] = Query(None, description="Optional contact URL (LinkedIn, etc.)"),
    current_user: UserResponse = Depends(get_current_user),
) -> Document:
    """
    Upload a new document.

    Args:
        file: File to upload
        collection: Collection type
        title: Document title (defaults to filename without extension)
        supplemental_info: Additional context to embed with document
        reference_url: Optional reference URL
        email: Optional contact email
        phone: Optional contact phone
        contact_url: Optional contact URL
        current_user: Authenticated user from JWT token

    Returns:
        Created document object
    """
    try:
        user_id = current_user.id
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
            title=title,
            supplemental_info=supplemental_info,
            filename=file.filename or "unknown",
            collection=collection,
            reference_url=reference_url,
            email=email,
            phone=phone,
            contact_url=contact_url,
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
async def delete_document(document_id: str, current_user: UserResponse = Depends(get_current_user)) -> dict:
    """
    Delete a document.

    Args:
        document_id: Document UUID
        current_user: Authenticated user from JWT token

    Returns:
        Success message
    """
    try:
        user_id = current_user.id
        await document_service.delete_document(document_id, user_id)
        return {"message": "Document deleted successfully"}
    except AutoBidderError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/documents/{document_id}/reprocess", tags=["knowledge-base"])
async def reprocess_document(document_id: str, current_user: UserResponse = Depends(get_current_user)) -> dict:
    """
    Reprocess a document (re-chunk and re-embed).

    Args:
        document_id: Document UUID
        current_user: Authenticated user from JWT token

    Returns:
        Success message
    """
    try:
        user_id = current_user.id
        await document_service.reprocess_document(document_id, user_id)
        return {"message": "Document reprocessing started"}
    except AutoBidderError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error reprocessing document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/documents/{document_id}/stats", response_model=DocumentStats, tags=["knowledge-base"])
async def get_document_stats(document_id: str, current_user: UserResponse = Depends(get_current_user)) -> DocumentStats:
    """
    Get statistics for a document.

    Args:
        document_id: Document UUID
        current_user: Authenticated user from JWT token

    Returns:
        Document statistics
    """
    try:
        user_id = current_user.id
        return await document_service.get_document_stats(document_id, user_id)
    except AutoBidderError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting document stats: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
