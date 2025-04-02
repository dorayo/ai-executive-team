from typing import Dict, Any
from pydantic import BaseModel

class ExecutiveInfo(BaseModel):
    """高管信息"""
    name: str
    title: str
    
    class Config:
        from_attributes = True

class QueryResponse(BaseModel):
    """查询响应模型"""
    query: str
    response: str
    executive: ExecutiveInfo
    
    class Config:
        from_attributes = True 