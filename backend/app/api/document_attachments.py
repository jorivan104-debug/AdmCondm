from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
from pathlib import Path
from app.core.database import get_db
from app.core.permissions import check_condominium_access, Role
from app.core.config import settings
from app.models.document_attachment import DocumentAttachment, AttachmentEntityType
from app.models.condominium import Condominium
from app.models.resident import Resident
from app.models.property import Property
from app.models.user import User
from app.api.auth import get_current_user
from app.schemas.document_attachment import DocumentAttachmentCreate, DocumentAttachmentUpdate, DocumentAttachmentResponse

router = APIRouter()

# Ensure upload directory exists
UPLOAD_DIR = Path(settings.UPLOAD_DIR)
UPLOAD_DIR.mkdir(exist_ok=True)
ATTACHMENTS_DIR = UPLOAD_DIR / "attachments"
ATTACHMENTS_DIR.mkdir(exist_ok=True)


def ensure_upload_dir():
    """Ensure upload directory exists"""
    ATTACHMENTS_DIR.mkdir(parents=True, exist_ok=True)




@router.post("/", response_model=DocumentAttachmentResponse, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    condominium_id: int = Form(...),
    entity_type: AttachmentEntityType = Form(...),
    entity_id: int = Form(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload a document attachment for a resident or property"""
    # Check condominium access
    if not check_condominium_access(db, current_user, condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    # Check if user has admin role
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if Role.ADMIN not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can upload attachments"
        )
    
    # Verify entity exists and belongs to condominium
    if entity_type == AttachmentEntityType.RESIDENT:
        entity = db.query(Resident).filter(Resident.id == entity_id).first()
        if not entity or entity.condominium_id != condominium_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resident not found or does not belong to this condominium"
            )
    elif entity_type == AttachmentEntityType.PROPERTY:
        entity = db.query(Property).filter(Property.id == entity_id).first()
        if not entity or entity.condominium_id != condominium_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found or does not belong to this condominium"
            )
    
    # Read file content
    file_content = await file.read()
    file_size = len(file_content)
    
    # Check file size
    if file_size > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE} bytes"
        )
    
    # Create attachment record first to get ID
    attachment = DocumentAttachment(
        condominium_id=condominium_id,
        entity_type=entity_type,
        entity_id=entity_id,
        title=title,
        description=description,
        file_path="",  # Will be updated
        file_name=file.filename,
        file_size=file_size,
        mime_type=file.content_type,
        uploaded_by=current_user.id
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    
    # Save file with attachment ID
    ensure_upload_dir()
    file_ext = Path(file.filename).suffix
    filename = f"{entity_type.value}_{entity_id}_{attachment.id}{file_ext}"
    file_path_obj = ATTACHMENTS_DIR / filename
    
    with open(file_path_obj, "wb") as buffer:
        buffer.write(file_content)
    
    file_path = str(file_path_obj.relative_to(settings.UPLOAD_DIR)).replace("\\", "/")
    attachment.file_path = file_path
    db.commit()
    db.refresh(attachment)
    
    return attachment


@router.get("/{entity_type}/{entity_id}", response_model=List[DocumentAttachmentResponse])
async def get_attachments(
    entity_type: AttachmentEntityType,
    entity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all attachments for a resident or property"""
    attachments = db.query(DocumentAttachment).filter(
        DocumentAttachment.entity_type == entity_type,
        DocumentAttachment.entity_id == entity_id
    ).all()
    
    if not attachments:
        return []
    
    # Check condominium access using first attachment
    first_attachment = attachments[0]
    if not check_condominium_access(db, current_user, first_attachment.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return attachments


@router.delete("/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an attachment"""
    attachment = db.query(DocumentAttachment).filter(DocumentAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found"
        )
    
    if not check_condominium_access(db, current_user, attachment.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Check if user has admin role
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if Role.ADMIN not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete attachments"
        )
    
    # Delete file if exists
    file_path = Path(settings.UPLOAD_DIR) / attachment.file_path
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception:
            pass  # Continue even if file deletion fails
    
    db.delete(attachment)
    db.commit()
    
    return None

