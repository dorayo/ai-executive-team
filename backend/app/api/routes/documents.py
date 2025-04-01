from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.api.deps import get_current_user
from app.schemas.document import DocumentResponse, DocumentCreateResponse
from app.schemas.user import User
from app.services.document import create_document, get_document, get_documents, delete_document

router = APIRouter()

@router.get("/", response_model=List[DocumentResponse])
async def read_documents(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
):
    """
    获取所有文档列表
    """
    return get_documents(db, skip=skip, limit=limit)

@router.post("/", response_model=DocumentCreateResponse)
async def upload_document(
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
):
    """
    上传新文档
    """
    try:
        doc = await create_document(
            db=db,
            file=file,
            title=title,
            description=description,
            user_id=current_user.id
        )
        
        return DocumentCreateResponse(
            id=doc.id,
            title=doc.title,
            description=doc.description,
            content_type=doc.content_type,
            created_at=doc.created_at,
            processing_status=doc.processing_status,
            message="文档上传成功，正在处理中"
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"文档上传失败: {str(e)}"
        )

@router.get("/{document_id}", response_model=DocumentResponse)
async def read_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    获取文档详情
    """
    doc = get_document(db, document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文档不存在"
        )
    
    return doc

@router.delete("/{document_id}")
async def remove_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    删除文档
    """
    doc = get_document(db, document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文档不存在"
        )
    
    # 检查权限: 只有文档上传者或管理员可以删除
    if doc.uploaded_by != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="没有权限删除此文档"
        )
    
    success = delete_document(db, document_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="文档删除失败"
        )
    
    return {"detail": "文档删除成功"} 