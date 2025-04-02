from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
import logging

from app.models.user import User
from app.models.request import QueryRequest
from app.models.response import QueryResponse
from app.models.executive import AIExecutive
from app.core.config import settings
from app.core.security import get_current_active_user
from app.ai.executive_engine import ExecutiveEngine
from app.api.deps import get_executives, get_knowledge_base

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/query", response_model=QueryResponse)
async def process_query(
    request: QueryRequest,
    current_user: User = Depends(get_current_active_user),
    executives: List[AIExecutive] = Depends(get_executives),
    knowledge_base = Depends(get_knowledge_base)
) -> Dict[str, Any]:
    """
    处理用户查询，返回AI执行团队的回答
    """
    try:
        # 初始化AI高管执行引擎，使用新的知识库
        engine = ExecutiveEngine(knowledge_base=knowledge_base)
        
        # 使用主要高管分析和处理查询（这里我们选择CEO或第一个高管）
        primary_executive = next((exec for exec in executives if exec.role == "CEO"), executives[0])
        
        # 使用新方法处理查询
        result = await engine.analyze_query(request.query, primary_executive)
        
        return {
            "query": request.query,
            "response": result["response"],
            "executive": {
                "name": result["executive"]["name"],
                "title": result["executive"]["title"]
            }
        }
    except Exception as e:
        logger.error(f"处理查询失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"处理查询失败: {str(e)}") 