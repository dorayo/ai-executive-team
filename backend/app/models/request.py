from typing import Optional
from pydantic import BaseModel, Field

class QueryRequest(BaseModel):
    """用户查询请求模型"""
    query: str = Field(..., min_length=1, max_length=5000, description="用户查询内容")
    
    class Config:
        from_attributes = True 