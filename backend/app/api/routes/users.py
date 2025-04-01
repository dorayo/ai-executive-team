from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.schemas.user import User, UserCreate, UserUpdate
from app.services.user import get_users, get_user_by_id, create_user, update_user, delete_user, check_user_exists
from app.db.session import get_db

router = APIRouter()

@router.get("/", response_model=List[User])
def read_users(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    users = get_users(db, skip=skip, limit=limit)
    return users

@router.post("/", response_model=User)
def create_new_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
):
    # 先检查用户是否已存在
    if check_user_exists(db, user_in.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    try:
        user = create_user(db, user_in)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    return user

@router.get("/{user_id}", response_model=User)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
):
    user = get_user_by_id(db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user

@router.put("/{user_id}", response_model=User)
def update_user_info(
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(get_db),
):
    user = get_user_by_id(db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    user = update_user(db, user=user, user_in=user_in)
    return user

@router.delete("/{user_id}", response_model=User)
def delete_user_account(
    user_id: int,
    db: Session = Depends(get_db),
):
    user = get_user_by_id(db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    user = delete_user(db, user_id=user_id)
    return user 