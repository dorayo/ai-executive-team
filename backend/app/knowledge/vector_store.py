from pinecone import Pinecone, ServerlessSpec, PineconeApiException, PineconeProtocolError
import os
import time
import logging
import numpy as np
from typing import List, Dict, Any, Optional, Tuple, Union
from app.core.config import settings

# 设置日志记录器
logger = logging.getLogger(__name__)

# 定义常量
MAX_RETRY_ATTEMPTS = 3
RETRY_DELAY_SECONDS = 2
DEFAULT_DIMENSION = 1536  # OpenAI embeddings 维度
DEFAULT_METRIC = "cosine"
DEFAULT_CLOUD = "aws"
DEFAULT_REGION = "us-west-2"

class VectorStoreStatus:
    """向量存储状态类"""
    OK = "ok"
    UNAVAILABLE = "unavailable"
    NOT_CONFIGURED = "not_configured"
    ERROR = "error"

# 全局变量：Pinecone 连接状态缓存
_pinecone_status = {
    "status": VectorStoreStatus.NOT_CONFIGURED,
    "last_check": 0,
    "error": None
}

def check_api_key() -> bool:
    """
    检查是否配置了 Pinecone API 密钥
    
    Returns:
        bool: 是否配置了有效的 API 密钥
    """
    return bool(settings.PINECONE_API_KEY and settings.PINECONE_API_KEY.strip())

def init_pinecone(force_recreate: bool = False) -> Optional[Any]:
    """
    初始化 Pinecone 向量数据库连接
    
    Args:
        force_recreate: 是否强制重新创建索引
        
    Returns:
        Pinecone 索引对象，如果失败则返回 None
        
    Raises:
        Exception: 初始化失败时抛出异常
    """
    global _pinecone_status
    
    if not check_api_key():
        _pinecone_status = {
            "status": VectorStoreStatus.NOT_CONFIGURED,
            "last_check": time.time(),
            "error": "未配置 Pinecone API 密钥"
        }
        logger.warning("未配置 Pinecone API 密钥，向量存储功能不可用")
        return None
    
    try:
        logger.info(f"初始化 Pinecone 连接，索引名称: {settings.PINECONE_INDEX_NAME}")
        pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        
        # 检查索引是否存在
        index_exists = settings.PINECONE_INDEX_NAME in pc.list_indexes().names()
        
        if not index_exists or force_recreate:
            if index_exists and force_recreate:
                logger.info(f"正在删除现有索引: {settings.PINECONE_INDEX_NAME}")
                pc.delete_index(settings.PINECONE_INDEX_NAME)
            
            logger.info(f"创建新索引: {settings.PINECONE_INDEX_NAME}")
            pc.create_index(
                name=settings.PINECONE_INDEX_NAME,
                dimension=DEFAULT_DIMENSION,
                metric=DEFAULT_METRIC,
                spec=ServerlessSpec(
                    cloud=DEFAULT_CLOUD,
                    region=DEFAULT_REGION
                )
            )
            logger.info(f"索引 {settings.PINECONE_INDEX_NAME} 创建成功")
        
        # 连接到索引
        index = pc.Index(settings.PINECONE_INDEX_NAME)
        
        # 更新状态
        _pinecone_status = {
            "status": VectorStoreStatus.OK,
            "last_check": time.time(),
            "error": None
        }
        
        return index
    
    except PineconeApiException as e:
        error_msg = f"Pinecone API 错误: {str(e)}"
        logger.error(error_msg)
        _pinecone_status = {
            "status": VectorStoreStatus.ERROR,
            "last_check": time.time(),
            "error": error_msg
        }
        raise
    
    except Exception as e:
        error_msg = f"初始化 Pinecone 失败: {str(e)}"
        logger.error(error_msg)
        _pinecone_status = {
            "status": VectorStoreStatus.ERROR,
            "last_check": time.time(),
            "error": error_msg
        }
        raise

def get_pinecone_index(retry: bool = True) -> Any:
    """
    获取 Pinecone 索引，如果需要则初始化
    
    Args:
        retry: 是否在失败时重试
        
    Returns:
        Pinecone 索引对象
        
    Raises:
        Exception: 如果无法获取索引则抛出异常
    """
    if not check_api_key():
        raise ValueError("未配置 Pinecone API 密钥，无法获取索引")
    
    # 重试逻辑
    attempts = 0
    last_error = None
    
    while attempts < (MAX_RETRY_ATTEMPTS if retry else 1):
        attempts += 1
        try:
            pc = Pinecone(api_key=settings.PINECONE_API_KEY)
            index = pc.Index(settings.PINECONE_INDEX_NAME)
            
            # 验证索引是否可用
            stats = index.describe_index_stats()
            if stats:
                _pinecone_status["status"] = VectorStoreStatus.OK
                _pinecone_status["last_check"] = time.time()
                _pinecone_status["error"] = None
                return index
                
        except Exception as e:
            last_error = e
            logger.warning(f"尝试 {attempts}/{MAX_RETRY_ATTEMPTS} 获取 Pinecone 索引失败: {str(e)}")
            
            if attempts < MAX_RETRY_ATTEMPTS and retry:
                logger.info(f"将在 {RETRY_DELAY_SECONDS} 秒后重试...")
                time.sleep(RETRY_DELAY_SECONDS)
            
            # 最后一次尝试失败，尝试初始化
            if attempts == MAX_RETRY_ATTEMPTS - 1 and retry:
                logger.info("尝试重新初始化 Pinecone...")
                try:
                    return init_pinecone()
                except Exception as init_error:
                    logger.error(f"重新初始化 Pinecone 失败: {str(init_error)}")
    
    # 所有尝试都失败
    _pinecone_status["status"] = VectorStoreStatus.UNAVAILABLE
    _pinecone_status["last_check"] = time.time()
    _pinecone_status["error"] = str(last_error)
    
    if last_error:
        raise last_error
    else:
        raise RuntimeError("无法连接到 Pinecone 向量数据库")

def get_vector_store_status() -> Dict[str, Any]:
    """
    获取向量存储的状态
    
    Returns:
        包含状态信息的字典
    """
    # 如果状态是 NOT_CONFIGURED，或者超过 30 分钟没有检查，则重新检查
    if (_pinecone_status["status"] == VectorStoreStatus.NOT_CONFIGURED or
        time.time() - _pinecone_status["last_check"] > 1800):  # 30 分钟
        try:
            if check_api_key():
                # 尝试获取索引而不重试，只是为了检查状态
                get_pinecone_index(retry=False)
            else:
                _pinecone_status["status"] = VectorStoreStatus.NOT_CONFIGURED
                _pinecone_status["last_check"] = time.time()
        except Exception as e:
            _pinecone_status["status"] = VectorStoreStatus.ERROR
            _pinecone_status["last_check"] = time.time()
            _pinecone_status["error"] = str(e)
    
    return {
        "status": _pinecone_status["status"],
        "last_check": _pinecone_status["last_check"],
        "error": _pinecone_status["error"],
        "configured": check_api_key()
    }

def add_documents(texts: List[str], metadatas: List[Dict[str, Any]], document_id: int, namespace: str = "default") -> Tuple[List[str], List[str]]:
    """
    将文档块添加到向量存储，包含元数据
    
    Args:
        texts: 文本块列表
        metadatas: 每个块的元数据列表
        document_id: 这些块所属的文档ID
        namespace: 使用的 Pinecone 命名空间
        
    Returns:
        Tuple 包含: (成功的向量 ID 列表, 失败的文本块列表)
    """
    from openai import OpenAI
    
    # 检查参数
    if not texts:
        return ([], [])
    
    if len(texts) != len(metadatas):
        raise ValueError(f"texts 和 metadatas 长度不匹配: {len(texts)} vs {len(metadatas)}")
    
    # 初始化 OpenAI 客户端
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    # 初始化 Pinecone 索引
    index = get_pinecone_index()
    
    # 批处理大小，避免一次处理太多文本
    batch_size = 100
    successful_ids = []
    failed_texts = []
    
    # 分批处理
    for batch_start in range(0, len(texts), batch_size):
        batch_end = min(batch_start + batch_size, len(texts))
        batch_texts = texts[batch_start:batch_end]
        batch_metadatas = metadatas[batch_start:batch_end]
        
        try:
            logger.info(f"为文档 {document_id} 生成嵌入向量, 批次 {batch_start//batch_size + 1}/{(len(texts)+batch_size-1)//batch_size}")
            
            # 为所有文本生成嵌入
            response = client.embeddings.create(
                input=batch_texts,
                model="text-embedding-3-small"
            )
            
            embeddings = [embedding.embedding for embedding in response.data]
            
            # 准备向量进行上传
            vector_ids = []
            vectors = []
            
            for i, (text, metadata, embedding) in enumerate(zip(batch_texts, batch_metadatas, embeddings)):
                # 创建唯一的向量 ID
                vector_id = f"doc_{document_id}_chunk_{batch_start + i}"
                vector_ids.append(vector_id)
                
                # 将文本添加到元数据中以便检索
                metadata_copy = metadata.copy()
                metadata_copy["text"] = text
                metadata_copy["document_id"] = document_id
                
                # 准备向量元组
                vector = (vector_id, embedding, metadata_copy)
                vectors.append(vector)
            
            # 将向量上传到 Pinecone
            logger.info(f"向 Pinecone 上传 {len(vectors)} 个向量")
            index.upsert(vectors=vectors, namespace=namespace)
            
            successful_ids.extend(vector_ids)
            
        except Exception as e:
            logger.error(f"批次 {batch_start//batch_size + 1} 向量处理失败: {str(e)}")
            failed_texts.extend(batch_texts)
    
    logger.info(f"文档 {document_id} 向量处理完成: {len(successful_ids)} 成功, {len(failed_texts)} 失败")
    return (successful_ids, failed_texts)

def search_vectors(query: str, top_k: int = 5, namespace: str = "default", filter_dict: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """
    基于查询字符串搜索相似向量
    
    Args:
        query: 查询字符串
        top_k: 返回结果数量
        namespace: 搜索的 Pinecone 命名空间
        filter_dict: 可选的过滤条件
        
    Returns:
        包含搜索结果的字典列表
    """
    from openai import OpenAI
    
    # 验证输入
    if not query or not query.strip():
        return []
    
    # 初始化 OpenAI 客户端
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    try:
        # 初始化 Pinecone 索引
        index = get_pinecone_index()
        
        # 为查询生成嵌入
        response = client.embeddings.create(
            input=[query],
            model="text-embedding-3-small"
        )
        
        query_embedding = response.data[0].embedding
        
        # 在 Pinecone 中搜索
        results = index.query(
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True,
            namespace=namespace,
            filter=filter_dict
        )
        
        # 格式化结果
        formatted_results = []
        for match in results.matches:
            formatted_results.append({
                "score": match.score,
                "text": match.metadata.get("text", ""),
                "document_id": match.metadata.get("document_id", ""),
                "document_title": match.metadata.get("document_title", ""),
                "page_number": match.metadata.get("page_number", ""),
                "chunk_index": match.metadata.get("chunk_index", ""),
            })
        
        logger.info(f"查询 '{query[:50]}...' 返回 {len(formatted_results)} 个结果")
        return formatted_results
        
    except Exception as e:
        logger.error(f"向量搜索失败: {str(e)}")
        raise RuntimeError(f"向量搜索失败: {str(e)}")

def delete_document_vectors(document_id: int, namespace: str = "default") -> bool:
    """
    删除与文档关联的所有向量
    
    Args:
        document_id: 要删除向量的文档ID
        namespace: Pinecone 命名空间
        
    Returns:
        成功则返回 True
    """
    try:
        # 初始化 Pinecone 索引
        index = get_pinecone_index()
        
        # 删除与 document_id 匹配的向量
        logger.info(f"删除文档 {document_id} 的向量")
        index.delete(
            filter={"document_id": document_id},
            namespace=namespace
        )
        
        return True
    except Exception as e:
        logger.error(f"删除文档 {document_id} 向量失败: {str(e)}")
        return False

def reset_vector_store() -> bool:
    """
    重置向量存储（删除并重新创建索引）
    
    Returns:
        成功则返回 True
    """
    try:
        # 强制重新创建索引
        init_pinecone(force_recreate=True)
        return True
    except Exception as e:
        logger.error(f"重置向量存储失败: {str(e)}")
        return False 