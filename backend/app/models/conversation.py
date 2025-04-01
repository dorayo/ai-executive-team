from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
import enum
from app.db.base import Base

class SenderType(str, enum.Enum):
    """消息发送者类型"""
    USER = "USER"
    AI = "AI"
    SYSTEM = "SYSTEM"

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    content = Column(Text, nullable=False)
    sender_type = Column(Enum(SenderType), nullable=False)
    sender_id = Column(Integer, nullable=True)  # Can reference either user or ai_executive
    created_at = Column(DateTime(timezone=True), server_default=func.now()) 