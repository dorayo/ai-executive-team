from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Shared properties
class DocumentBase(BaseModel):
    """文档基础模型"""
    title: str
    description: Optional[str] = None

# Properties to receive via API on creation
class DocumentCreate(DocumentBase):
    """用于创建文档的请求模型"""
    pass

# Properties to receive via API on update
class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None

class DocumentInDBBase(DocumentBase):
    """数据库中的文档模型"""
    id: int
    file_path: Optional[str] = None
    vector_ids: Optional[str] = None
    uploaded_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Additional properties to return via API
class DocumentResponse(DocumentInDBBase):
    """文档响应模型"""
    content_type: str
    processing_status: str
    processing_error: Optional[str] = None

class DocumentCreateResponse(BaseModel):
    """文档创建响应"""
    id: int
    title: str
    description: Optional[str] = None
    content_type: str
    created_at: datetime
    processing_status: str
    message: str
    
    class Config:
        from_attributes = True

class DocumentSearchQuery(BaseModel):
    """文档搜索查询"""
    query: str
    top_k: int = 5

class DocumentSearchResult(BaseModel):
    """文档搜索结果"""
    document_id: int
    document_title: str
    text: str
    score: float
    page_number: Optional[int] = None
    
    class Config:
        from_attributes = True

class DocumentSearchResponse(BaseModel):
    """文档搜索响应"""
    query: str
    results: List[DocumentSearchResult] 