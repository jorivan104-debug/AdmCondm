from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.document_attachment import AttachmentEntityType


class DocumentAttachmentBase(BaseModel):
    title: str
    description: Optional[str] = None
    entity_type: AttachmentEntityType
    entity_id: int


class DocumentAttachmentCreate(DocumentAttachmentBase):
    condominium_id: int


class DocumentAttachmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class DocumentAttachmentResponse(DocumentAttachmentBase):
    id: int
    condominium_id: int
    file_path: str
    file_name: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    uploaded_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

