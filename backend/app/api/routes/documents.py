from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query, BackgroundTasks, Path
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any

from app.db.session import get_db
from app.api.deps import get_current_user
from app.schemas.document import (
    DocumentResponse, 
    DocumentCreateResponse, 
    DocumentSearchQuery, 
    DocumentSearchResponse,
    VectorSearchQuery
)
from app.schemas.user import User
from app.services.document import (
    create_document, 
    get_document, 
    get_documents, 
    delete_document,
    search_documents_by_keyword,
    get_document_content,
    retry_document_processing
)
from app.knowledge.vector_store import search_vectors, get_vector_store_status

router = APIRouter()

@router.get("/", response_model=List[DocumentResponse])
async def read_documents(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    """
    获取文档列表
    
    可选的关键字搜索功能（基于标题和描述）
    """
    if search:
        return search_documents_by_keyword(db, search, skip, limit)
    return get_documents(db, skip=skip, limit=limit)

@router.post("/", response_model=DocumentCreateResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
):
    """
    上传新文档
    
    文件处理和向量化将在后台异步进行
    """
    try:
        doc = await create_document(
            db=db,
            file=file,
            title=title,
            description=description,
            user_id=current_user.id,
            background_tasks=background_tasks
        )
        
        return DocumentCreateResponse(
            id=doc.id,
            title=doc.title,
            description=doc.description,
            content_type=doc.content_type,
            created_at=doc.created_at,
            processing_status=doc.processing_status,
            message="文档上传成功，正在后台处理中"
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
    document_id: int = Path(..., gt=0),
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

@router.get("/{document_id}/content", response_model=Dict[str, str])
async def read_document_content(
    document_id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    获取文档内容
    """
    try:
        content = get_document_content(db, document_id)
        return {"content": content}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取文档内容失败: {str(e)}"
        )

@router.post("/{document_id}/retry", response_model=Dict[str, str])
async def retry_processing(
    background_tasks: BackgroundTasks,
    document_id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    重试文档处理
    
    用于之前处理失败的文档
    """
    doc = get_document(db, document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文档不存在"
        )
    
    # 检查权限
    if doc.uploaded_by != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="没有权限重新处理此文档"
        )
    
    success = retry_document_processing(db, document_id, background_tasks)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="重新处理文档失败"
        )
    
    return {"detail": "文档重新处理已开始"}

@router.delete("/{document_id}")
async def remove_document(
    document_id: int = Path(..., gt=0),
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

@router.post("/search", response_model=List[DocumentSearchResponse])
async def search_documents(
    query: DocumentSearchQuery,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    基于关键字搜索文档
    
    仅搜索标题和描述
    """
    if not query.query.strip():
        return []
    
    return search_documents_by_keyword(db, query.query, 0, query.top_k)

@router.post("/vector-search", response_model=List[Dict[str, Any]])
async def vector_search(
    query: VectorSearchQuery,
    current_user: User = Depends(get_current_user),
):
    """
    基于向量相似度搜索文档内容
    
    执行语义搜索，找到与查询语义相似的内容块
    """
    if not query.query.strip():
        return []
    
    # 检查向量存储状态
    vector_status = get_vector_store_status()
    if vector_status["status"] != "ok":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"向量搜索服务不可用: {vector_status['error']}"
        )
    
    try:
        filter_dict = None
        if query.document_id:
            filter_dict = {"document_id": query.document_id}
        
        return search_vectors(
            query=query.query, 
            top_k=query.top_k,
            filter_dict=filter_dict
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"向量搜索失败: {str(e)}"
        )

@router.get("/vector-store/status", response_model=Dict[str, Any])
async def vector_store_status(
    current_user: User = Depends(get_current_user),
):
    """
    获取向量存储状态
    """
    return get_vector_store_status() 