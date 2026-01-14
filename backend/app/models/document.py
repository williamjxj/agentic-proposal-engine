"""
Document Models

Pydantic models for knowledge base document management.
Matches database schema from knowledge_base_documents table.
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class DocumentBase(BaseModel):
    """Base document model with common fields."""
    
    filename: str = Field(..., max_length=500, description="Document filename")
    file_type: str = Field(..., description="File type: pdf, docx, or txt")
    file_size_bytes: int = Field(..., ge=0, description="File size in bytes")
    file_url: Optional[str] = Field(None, description="File URL in storage")
    collection: str = Field(..., description="Collection: case_studies, team_profiles, portfolio, or other")
    
    @field_validator('file_type')
    @classmethod
    def validate_file_type(cls, v: str) -> str:
        """Validate file type is one of allowed values."""
        allowed = {'pdf', 'docx', 'txt'}
        if v not in allowed:
            raise ValueError(f"file_type must be one of {allowed}")
        return v
    
    @field_validator('collection')
    @classmethod
    def validate_collection(cls, v: str) -> str:
        """Validate collection is one of allowed values."""
        allowed = {'case_studies', 'team_profiles', 'portfolio', 'other'}
        if v not in allowed:
            raise ValueError(f"collection must be one of {allowed}")
        return v


class DocumentCreate(DocumentBase):
    """Model for creating a new document record."""
    
    processing_status: str = Field(default='pending', description="Initial processing status")
    
    @field_validator('processing_status')
    @classmethod
    def validate_processing_status(cls, v: str) -> str:
        """Validate processing status."""
        allowed = {'pending', 'processing', 'completed', 'failed'}
        if v not in allowed:
            raise ValueError(f"processing_status must be one of {allowed}")
        return v


class DocumentUpdate(BaseModel):
    """Model for updating an existing document."""
    
    processing_status: Optional[str] = None
    processing_error: Optional[str] = None
    chunk_count: Optional[int] = Field(None, ge=0)
    token_count: Optional[int] = Field(None, ge=0)
    retrieval_count: Optional[int] = Field(None, ge=0)
    
    @field_validator('processing_status')
    @classmethod
    def validate_processing_status(cls, v: Optional[str]) -> Optional[str]:
        """Validate processing status if provided."""
        if v is not None:
            allowed = {'pending', 'processing', 'completed', 'failed'}
            if v not in allowed:
                raise ValueError(f"processing_status must be one of {allowed}")
        return v


class Document(DocumentBase):
    """Complete document model with all fields."""
    
    id: str = Field(..., description="Document UUID")
    user_id: str = Field(..., description="User UUID")
    processing_status: str = Field(..., description="Processing status")
    processing_error: Optional[str] = Field(None, description="Processing error message")
    chunk_count: int = Field(default=0, description="Number of text chunks")
    token_count: int = Field(default=0, description="Total token count")
    embedding_model: Optional[str] = Field(None, description="Embedding model used")
    chroma_collection_name: Optional[str] = Field(None, description="ChromaDB collection name")
    retrieval_count: int = Field(default=0, description="Number of times retrieved")
    last_retrieved_at: Optional[datetime] = Field(None, description="Last retrieval timestamp")
    uploaded_at: datetime = Field(..., description="Upload timestamp")
    processed_at: Optional[datetime] = Field(None, description="Processing completion timestamp")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class DocumentStats(BaseModel):
    """Document statistics model."""
    
    document_id: str = Field(..., description="Document UUID")
    retrieval_count: int = Field(..., description="Number of times retrieved")
    last_retrieved_at: Optional[datetime] = Field(None, description="Last retrieval timestamp")
    chunk_count: int = Field(..., description="Number of text chunks")
    token_count: int = Field(..., description="Total token count")
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
