from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from app.models.conversation import SenderType

# 消息模型
class MessageBase(BaseModel):
    """消息基础模型"""
    content: str = Field(..., description="消息内容")
    sender_type: SenderType = Field(..., description="发送者类型：用户或AI")
    sender_id: int = Field(..., description="发送者ID")

class MessageCreate(MessageBase):
    """消息创建模型"""
    pass

class MessageInDBBase(MessageBase):
    """数据库中的消息模型（基础）"""
    id: int
    conversation_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class Message(MessageInDBBase):
    """API响应中的消息模型"""
    pass

class MessageResponse(BaseModel):
    """消息响应模型"""
    id: int
    content: str
    sender_type: SenderType
    sender_id: int
    sender_name: Optional[str] = None
    sender_role: Optional[str] = None
    created_at: datetime

# 对话模型
class ConversationBase(BaseModel):
    """对话基础模型"""
    title: str = Field(..., description="对话标题")

class ConversationCreate(ConversationBase):
    """对话创建模型"""
    pass

class ConversationUpdate(BaseModel):
    """对话更新模型"""
    title: Optional[str] = None

class ConversationInDBBase(ConversationBase):
    """数据库中的对话模型（基础）"""
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class Conversation(ConversationInDBBase):
    """API响应中的对话模型"""
    pass

class ConversationWithMessages(Conversation):
    """包含消息的对话模型"""
    messages: List[MessageResponse] = []

class MessageRequest(BaseModel):
    """消息发送请求模型"""
    content: str = Field(..., description="用户发送的消息内容")

class MessageProcessResponse(BaseModel):
    """消息处理响应模型"""
    user_message: Message
    ai_message: Message
    primary_role: str
    secondary_roles: List[str] = []
    reasoning: str = ""

# For AI CEO task creation
class TaskCreate(BaseModel):
    task_description: str
    conversation_id: int 