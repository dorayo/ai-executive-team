from typing import Optional
from pydantic import BaseModel

class Token(BaseModel):
    """
    访问令牌模型
    """
    access_token: str
    token_type: str
    user_id: int

class TokenPayload(BaseModel):
    """
    JWT令牌负载
    """
    sub: Optional[int] = None
    exp: Optional[int] = None 