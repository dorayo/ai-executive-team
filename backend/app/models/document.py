from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from app.db.base import Base

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    file_path = Column(String, nullable=True)
    content_type = Column(String, nullable=False)  # pdf, text, html, etc.
    description = Column(Text, nullable=True)
    text_content = Column(Text, nullable=True)  # 将content重命名为text_content
    vector_ids = Column(Text, nullable=True)  # Comma-separated list of vector IDs in Pinecone
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    processing_status = Column(String, default="pending")  # pending, processing, completed, error
    processing_error = Column(Text, nullable=True)  # 存储处理错误信息
    filename = Column(String, nullable=True)  # 文件名
    file_size = Column(Integer, default=0)  # 文件大小
    is_processed = Column(Boolean, default=False)  # 处理完成标志
    vectorized = Column(Boolean, default=False)  # 向量化标志 