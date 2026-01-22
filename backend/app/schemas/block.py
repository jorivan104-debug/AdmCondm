from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class BlockBase(BaseModel):
    name: str
    description: Optional[str] = None


class BlockCreate(BlockBase):
    condominium_id: int


class BlockUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class BlockResponse(BlockBase):
    id: int
    condominium_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

