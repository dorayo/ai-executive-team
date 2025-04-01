from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.api.deps import get_current_user, get_current_active_superuser
from app.schemas.ai_executive import AIExecutive, AIExecutiveCreate, AIExecutiveUpdate
from app.schemas.user import User
from app.services.ai_executive import (
    get_ai_executives, get_ai_executive, create_ai_executive,
    update_ai_executive, delete_ai_executive, get_ai_executive_by_role
)

router = APIRouter()

@router.get("/", response_model=List[AIExecutive])
async def read_executives(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
    current_user: User = Depends(get_current_user),
):
    """
    获取所有AI高管列表
    """
    return get_ai_executives(db, skip=skip, limit=limit, active_only=active_only)

@router.get("/{executive_id}", response_model=AIExecutive)
async def read_executive(
    executive_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    获取特定AI高管详情
    """
    executive = get_ai_executive(db, executive_id=executive_id)
    if not executive:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI高管不存在"
        )
    return executive

@router.get("/role/{role}", response_model=AIExecutive)
async def read_executive_by_role(
    role: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    通过角色获取AI高管
    """
    executive = get_ai_executive_by_role(db, role=role)
    if not executive:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"角色为 {role} 的活跃AI高管不存在"
        )
    return executive

@router.post("/", response_model=AIExecutive)
async def create_executive(
    executive: AIExecutiveCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser),
):
    """
    创建新的AI高管 (仅管理员)
    """
    return create_ai_executive(db=db, executive=executive, user_id=current_user.id)

@router.put("/{executive_id}", response_model=AIExecutive)
async def update_executive(
    executive_id: int,
    executive_update: AIExecutiveUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser),
):
    """
    更新AI高管信息 (仅管理员)
    """
    return update_ai_executive(db=db, executive_id=executive_id, executive_update=executive_update)

@router.delete("/{executive_id}")
async def remove_executive(
    executive_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser),
):
    """
    删除AI高管 (仅管理员)
    """
    success = delete_ai_executive(db=db, executive_id=executive_id)
    if success:
        return {"detail": "AI高管已成功删除"}
    return {"detail": "删除失败"} 