from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    file_path = Column(String, nullable=True)
    content_type = Column(String, nullable=False)  # pdf, text, html, etc.
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=True)  # For smaller documents, store content directly
    vector_ids = Column(Text, nullable=True)  # Comma-separated list of vector IDs in Pinecone
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now()) 