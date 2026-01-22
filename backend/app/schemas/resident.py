from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ResidentBase(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    document_type: Optional[str] = None
    document_number: Optional[str] = None


class ResidentCreate(ResidentBase):
    condominium_id: int


class ResidentUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    document_type: Optional[str] = None
    document_number: Optional[str] = None
    user_id: Optional[int] = None


class ResidentResponse(ResidentBase):
    id: int
    condominium_id: int
    photo_url: Optional[str] = None
    user_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

