"""
知识库相关功能
"""
from typing import List, Dict, Any, Optional
import os
import logging
import json
from fastapi import HTTPException

from pinecone import Pinecone, Index
from openai import OpenAI, APIError

from app.core.config import settings

logger = logging.getLogger(__name__)

class KnowledgeBase:
    """知识库管理类"""
    
    def __init__(self):
        """初始化知识库连接"""
        self.pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        self.index_name = settings.PINECONE_INDEX
        try:
            self.index = self.pc.Index(self.index_name)
            logger.info(f"Successfully connected to Pinecone index: {self.index_name}")
        except Exception as e:
            logger.error(f"Failed to connect to Pinecone: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Knowledge base initialization failed: {str(e)}")

        # 初始化OpenAI客户端
        self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.embedding_model = settings.OPENAI_EMBEDDING_MODEL
    
    def get_embedding(self, text: str) -> List[float]:
        """获取文本嵌入向量"""
        try:
            response = self.openai_client.embeddings.create(
                model=self.embedding_model,
                input=text,
                encoding_format="float"
            )
            return response.data[0].embedding
        except APIError as e:
            logger.error(f"OpenAI API error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to generate embedding: {str(e)}")
    
    def search(self, query: str, top_k: int = 10) -> List[Dict[str, Any]]:
        """搜索知识库"""
        try:
            # 获取查询嵌入
            query_embedding = self.get_embedding(query)
            
            # 执行向量搜索
            results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True
            )
            
            # 格式化返回结果，优化引用格式
            formatted_results = []
            for match in results.matches:
                # 提取元数据
                metadata = match.metadata
                document_title = metadata.get("title", "未知文档")
                content = metadata.get("content", "")
                
                # 使用更清晰的格式
                formatted_result = {
                    "id": match.id,
                    "score": match.score,
                    "document_title": document_title,
                    "content": content,
                    # 添加格式化的引用文本，便于直接插入到回复中
                    "formatted_citation": f"### 引用自: {document_title}\n\n> {content.replace('\n', '\n> ')}\n"
                }
                formatted_results.append(formatted_result)
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Knowledge base search error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Knowledge base search failed: {str(e)}")
    
    # 其他知识库操作方法... 