from sqlalchemy.orm import Session
from typing import List, Optional

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash, verify_password

def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
    return db.query(User).offset(skip).limit(limit).all()

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def check_user_exists(db: Session, email: str) -> bool:
    """
    检查用户邮箱是否已存在
    """
    user = get_user_by_email(db, email)
    return user is not None

def create_user(db: Session, user_in: UserCreate) -> User:
    # 检查用户是否已存在
    if check_user_exists(db, user_in.email):
        raise ValueError(f"Email {user_in.email} already registered")
        
    db_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        is_active=user_in.is_active,
        is_superuser=user_in.is_superuser,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user: User, user_in: UserUpdate) -> User:
    # Update the basic fields
    user_data = user.__dict__
    for field in user_data:
        if field in user_in.__dict__ and getattr(user_in, field) is not None:
            setattr(user, field, getattr(user_in, field))
    
    # Handle password update
    if user_in.password:
        user.hashed_password = get_password_hash(user_in.password)
    
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def delete_user(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    db.delete(user)
    db.commit()
    return user

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, email=email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user 