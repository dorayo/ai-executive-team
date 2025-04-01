from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db

router = APIRouter()

@router.get("/")
def read_executives(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    """
    获取所有AI高管列表
    """
    # 将在第二阶段实现
    return [] 