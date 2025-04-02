from typing import Optional
from pydantic import BaseModel

class AIExecutive(BaseModel):
    """AI高管模型"""
    name: str
    role: str  # CEO, CFO, COO, CMO, LEGAL
    title: str
    description: str
    specialty: str
    prompt_template: str
    
    class Config:
        from_attributes = True 