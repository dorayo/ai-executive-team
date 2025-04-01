import os
import uuid
import logging
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from fastapi import UploadFile, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.document import Document
from app.knowledge.document_processor import (
    extract_text_from_file, 
    process_document,
    get_document_summary,
    SUPPORTED_EXTENSIONS
)
from app.knowledge.vector_store import delete_document_vectors, get_vector_store_status

# 设置日志记录器
logger = logging.getLogger(__name__)

# 确保上传目录存在
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

async def save_upload_file(upload_file: UploadFile) -> Tuple[str, str]:
    """
    保存上传文件到磁盘
    
    Args:
        upload_file: 上传的文件
        
    Returns:
        保存的文件路径和内容类型
    """
    content_type = upload_file.content_type
    
    # 检查文件类型是否支持
    file_extension = os.path.splitext(upload_file.filename or "")[1].lower()
    
    if not file_extension:
        raise HTTPException(
            status_code=400,
            detail="无法确定文件扩展名"
        )
    
    if file_extension not in SUPPORTED_EXTENSIONS and content_type not in SUPPORTED_EXTENSIONS.values():
        supported_exts = ", ".join(SUPPORTED_EXTENSIONS.keys())
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型: {file_extension or content_type}。支持的类型: {supported_exts}"
        )
    
    # 创建文件存储目录
    upload_dir = os.path.join(settings.UPLOAD_DIR, datetime.now().strftime("%Y%m"))
    os.makedirs(upload_dir, exist_ok=True)
    
    # 生成唯一文件名
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    # 保存文件
    with open(file_path, "wb") as f:
        content = await upload_file.read()
        f.write(content)
    
    logger.info(f"已保存文件: {file_path}, 类型: {content_type}")
    return file_path, content_type

async def process_document_async(db: Session, doc_id: int) -> None:
    """
    异步处理文档
    
    Args:
        db: 数据库会话
        doc_id: 文档ID
    """
    # 获取文档
    doc = get_document(db, doc_id)
    if not doc:
        logger.error(f"找不到文档 ID {doc_id}")
        return
    
    try:
        # 更新状态为处理中
        doc.processing_status = "processing"
        db.commit()
        
        # 提取文本
        text = extract_text_from_file(doc.file_path, doc.content_type)
        
        # 为较小的文档存储内容
        if len(text) <= 100000:  # 大约10万字符(约20页)
            doc.content = text
        else:
            # 对于大型文档，只存储摘要
            doc.content = get_document_summary(text, max_length=5000)
        
        # 更新数据库
        db.commit()
        
        # 检查向量存储状态
        vector_store_status = get_vector_store_status()
        if vector_store_status["status"] == "not_configured":
            doc.processing_status = "text_only"
            doc.processing_error = "未配置向量存储，只保存了文本内容"
            db.commit()
            logger.warning(f"文档 {doc_id} 只保存了文本，未配置向量存储")
            return
        
        # 处理文档并添加到向量存储
        vector_ids, failed_texts, status = process_document(
            document_id=doc.id,
            document_title=doc.title,
            text_content=text,
            namespace="default"
        )
        
        # 根据处理结果更新文档状态
        if status == "completed":
            doc.vector_ids = ",".join(vector_ids)
            doc.processing_status = "completed"
            logger.info(f"文档 {doc_id} 处理完成，生成了 {len(vector_ids)} 个向量")
        
        elif status == "partial":
            doc.vector_ids = ",".join(vector_ids)
            doc.processing_status = "partial"
            doc.processing_error = f"部分文本块处理失败，成功率: {len(vector_ids)}/{len(vector_ids) + len(failed_texts)}"
            logger.warning(f"文档 {doc_id} 部分处理完成: {len(vector_ids)} 成功, {len(failed_texts)} 失败")
        
        elif status == "api_key_missing":
            doc.processing_status = "text_only"
            doc.processing_error = "未配置向量存储 API 密钥，只保存了文本内容"
            logger.warning(f"文档 {doc_id} 只保存了文本，未配置 API 密钥")
            
        elif status == "no_chunks":
            doc.processing_status = "text_only"
            doc.processing_error = "文本分割失败，未生成文本块"
            logger.warning(f"文档 {doc_id} 文本分割失败")
            
        else:  # "failed"
            doc.processing_status = "error"
            doc.processing_error = "向量化处理失败"
            logger.error(f"文档 {doc_id} 向量化处理失败")
        
        # 更新数据库
        db.commit()
        
    except Exception as e:
        # 如果处理失败，仍保留文档记录，但设置错误标记
        error_msg = str(e)
        logger.error(f"处理文档 {doc_id} 时出错: {error_msg}")
        
        doc.processing_status = "error"
        doc.processing_error = error_msg
        db.commit()

async def create_document(
    db: Session,
    file: UploadFile,
    title: str,
    description: Optional[str] = None,
    user_id: Optional[int] = None,
    background_tasks: Optional[BackgroundTasks] = None
) -> Document:
    """
    创建新文档并安排处理任务
    
    Args:
        db: 数据库会话
        file: 上传的文件
        title: 文档标题
        description: 文档描述
        user_id: 上传用户ID
        background_tasks: 用于添加后台任务的对象
        
    Returns:
        创建的文档对象
    """
    # 保存文件到磁盘
    file_path, content_type = await save_upload_file(file)
    
    # 创建文档记录
    doc = Document(
        title=title,
        description=description,
        file_path=file_path,
        content_type=content_type,
        uploaded_by=user_id,
        processing_status="pending"
    )
    
    db.add(doc)
    db.commit()
    db.refresh(doc)
    
    # 在后台处理文档
    if background_tasks:
        background_tasks.add_task(process_document_async, db, doc.id)
    else:
        # 如果没有提供 background_tasks，则立即创建异步任务
        asyncio.create_task(process_document_async(db, doc.id))
    
    return doc

def get_document(db: Session, document_id: int) -> Optional[Document]:
    """获取文档"""
    return db.query(Document).filter(Document.id == document_id).first()

def get_documents(db: Session, skip: int = 0, limit: int = 100) -> List[Document]:
    """获取文档列表"""
    return db.query(Document).order_by(Document.created_at.desc()).offset(skip).limit(limit).all()

def search_documents_by_keyword(db: Session, keyword: str, skip: int = 0, limit: int = 100) -> List[Document]:
    """
    通过关键字搜索文档（基于标题和描述）
    
    Args:
        db: 数据库会话
        keyword: 搜索关键字
        skip: 跳过的记录数
        limit: 返回的记录限制
        
    Returns:
        匹配的文档列表
    """
    search_term = f"%{keyword}%"
    return db.query(Document).filter(
        (Document.title.ilike(search_term)) | 
        (Document.description.ilike(search_term))
    ).order_by(Document.created_at.desc()).offset(skip).limit(limit).all()

def get_document_content(db: Session, document_id: int) -> str:
    """
    获取文档内容
    
    Args:
        db: 数据库会话
        document_id: 文档ID
        
    Returns:
        文档内容
    """
    doc = get_document(db, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")
    
    # 如果数据库中有存储内容，直接返回
    if doc.content:
        return doc.content
    
    # 否则尝试从文件中提取
    try:
        return extract_text_from_file(doc.file_path, doc.content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"无法获取文档内容: {str(e)}")

def delete_document(db: Session, document_id: int) -> bool:
    """
    删除文档
    
    Args:
        db: 数据库会话
        document_id: 文档ID
        
    Returns:
        成功则返回 True
    """
    doc = get_document(db, document_id)
    if not doc:
        return False
    
    try:
        # 删除向量存储中的文档向量
        if doc.vector_ids:
            logger.info(f"删除文档 {document_id} 的向量")
            delete_document_vectors(doc.id)
        
        # 删除文件
        if doc.file_path and os.path.exists(doc.file_path):
            try:
                logger.info(f"删除文件: {doc.file_path}")
                os.remove(doc.file_path)
            except Exception as e:
                # 即使文件删除失败，也继续删除数据库记录
                logger.warning(f"删除文件失败: {doc.file_path}, 错误: {str(e)}")
        
        # 删除数据库记录
        db.delete(doc)
        db.commit()
        logger.info(f"文档 {document_id} 已成功删除")
        
        return True
    except Exception as e:
        logger.error(f"删除文档 {document_id} 失败: {str(e)}")
        return False

def retry_document_processing(db: Session, document_id: int, background_tasks: Optional[BackgroundTasks] = None) -> bool:
    """
    重试文档处理
    
    Args:
        db: 数据库会话
        document_id: 文档ID
        background_tasks: 用于添加后台任务的对象
        
    Returns:
        成功则返回 True
    """
    doc = get_document(db, document_id)
    if not doc:
        return False
    
    # 重置处理状态
    doc.processing_status = "pending"
    doc.processing_error = None
    doc.vector_ids = None
    db.commit()
    
    # 在后台重新处理文档
    if background_tasks:
        background_tasks.add_task(process_document_async, db, doc.id)
    else:
        # 如果没有提供 background_tasks，则立即创建异步任务
        asyncio.create_task(process_document_async(db, doc.id))
    
    return True 