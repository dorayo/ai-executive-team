from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db

router = APIRouter()

@router.get("/")
def read_documents(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    """
    获取所有文档列表
    """
    # 将在第二阶段实现
    return []

@router.post("/")
def create_document(
    db: Session = Depends(get_db),
    file: Optional[UploadFile] = File(None),
    title: str = Form(...),
    description: Optional[str] = Form(None),
):
    """
    上传新文档
    """
    # 将在第二阶段实现
    return {"message": "Document upload functionality will be implemented in phase 2"} 