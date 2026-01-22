from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DocumentBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None


class DocumentCreate(DocumentBase):
    condominium_id: int
    file_path: str
    file_name: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None


class DocumentResponse(DocumentBase):
    id: int
    condominium_id: int
    file_path: str
    file_name: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    version: int
    previous_version_id: Optional[int] = None
    uploaded_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

