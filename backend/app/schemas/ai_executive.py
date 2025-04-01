from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Shared properties
class AIExecutiveBase(BaseModel):
    """AI高管基础模型"""
    name: str
    role: str
    description: Optional[str] = None
    prompt_template: str

# Properties to receive via API on creation
class AIExecutiveCreate(AIExecutiveBase):
    """用于创建AI高管的请求模型"""
    pass

# Properties to receive via API on update
class AIExecutiveUpdate(BaseModel):
    """用于更新AI高管的请求模型"""
    name: Optional[str] = None
    description: Optional[str] = None
    prompt_template: Optional[str] = None
    is_active: Optional[bool] = None

class AIExecutiveInDBBase(AIExecutiveBase):
    """数据库中的AI高管模型"""
    id: int
    is_active: bool
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Additional properties to return via API
class AIExecutive(AIExecutiveInDBBase):
    """AI高管响应模型"""
    pass

class AIExecutiveResponse(AIExecutiveInDBBase):
    """AI高管详细响应模型"""
    pass 