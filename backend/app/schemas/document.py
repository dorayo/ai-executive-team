from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Shared properties
class DocumentBase(BaseModel):
    title: str
    content_type: str
    description: Optional[str] = None

# Properties to receive via API on creation
class DocumentCreate(DocumentBase):
    content: Optional[str] = None
    # file will be handled separately via form data

# Properties to receive via API on update
class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None

class DocumentInDBBase(DocumentBase):
    id: int
    file_path: Optional[str] = None
    content: Optional[str] = None
    vector_ids: Optional[str] = None
    uploaded_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Additional properties to return via API
class Document(DocumentInDBBase):
    pass

# For vector search results
class DocumentSearchResult(BaseModel):
    document_id: int
    document_title: str
    content_snippet: str
    similarity_score: float 