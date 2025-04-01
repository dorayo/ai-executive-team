from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db

router = APIRouter()

@router.get("/")
def read_conversations(
    db: Session = Depends(get_db),
    user_id: int = None,
    skip: int = 0,
    limit: int = 100,
):
    """
    获取对话列表
    """
    # 将在第二阶段实现
    return []

@router.post("/")
def create_conversation(
    db: Session = Depends(get_db),
):
    """
    创建新对话
    """
    # 将在第二阶段实现
    return {"message": "Conversation creation will be implemented in phase 2"}

@router.post("/{conversation_id}/messages")
def create_message(
    conversation_id: int,
    db: Session = Depends(get_db),
):
    """
    在对话中发送消息
    """
    # 将在第二阶段实现
    return {"message": "Message sending will be implemented in phase 2"}

@router.post("/{conversation_id}/task")
def create_task(
    conversation_id: int,
    db: Session = Depends(get_db),
):
    """
    向AI CEO提交任务
    """
    # 将在第二阶段实现
    return {"message": "Task submission to AI CEO will be implemented in phase 2"} 