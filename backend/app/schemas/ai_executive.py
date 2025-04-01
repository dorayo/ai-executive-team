from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Shared properties
class AIExecutiveBase(BaseModel):
    name: str
    role: str
    description: Optional[str] = None
    prompt_template: str
    is_active: bool = True

# Properties to receive via API on creation
class AIExecutiveCreate(AIExecutiveBase):
    pass

# Properties to receive via API on update
class AIExecutiveUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    description: Optional[str] = None
    prompt_template: Optional[str] = None
    is_active: Optional[bool] = None

class AIExecutiveInDBBase(AIExecutiveBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Additional properties to return via API
class AIExecutive(AIExecutiveInDBBase):
    pass 