from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
from pathlib import Path
from app.core.database import get_db
from app.core.permissions import check_condominium_access
from app.core.config import settings
from app.models.condominium import Condominium
from app.models.user import User, UserCondominium
from app.api.auth import get_current_user
from app.schemas.condominium import CondominiumCreate, CondominiumUpdate, CondominiumResponse

router = APIRouter()

# Ensure upload directory exists
UPLOAD_DIR = Path(settings.UPLOAD_DIR)
UPLOAD_DIR.mkdir(exist_ok=True)
CONDOMINIUM_UPLOAD_DIR = UPLOAD_DIR / "condominiums"
CONDOMINIUM_UPLOAD_DIR.mkdir(exist_ok=True)


def save_upload_file(file: UploadFile, condominium_id: int, file_type: str) -> str:
    """Save uploaded file and return URL"""
    file_ext = Path(file.filename).suffix
    filename = f"{file_type}_{condominium_id}{file_ext}"
    file_path = CONDOMINIUM_UPLOAD_DIR / filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return f"/uploads/condominiums/{filename}"


@router.post("/", response_model=CondominiumResponse, status_code=status.HTTP_201_CREATED)
async def create_condominium(
    condominium_data: CondominiumCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new condominium"""
    # Check if user has admin role
    from app.core.permissions import Role
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if Role.ADMIN not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create condominiums"
        )
    
    condominium = Condominium(**condominium_data.model_dump())
    db.add(condominium)
    db.commit()
    db.refresh(condominium)
    
    # Link user to condominium
    user_condo = UserCondominium(user_id=current_user.id, condominium_id=condominium.id)
    db.add(user_condo)
    db.commit()
    
    return condominium


@router.post("/{condominium_id}/upload-logo", response_model=CondominiumResponse)
async def upload_logo(
    condominium_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload logo for a condominium"""
    if not check_condominium_access(db, current_user, condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    condominium = db.query(Condominium).filter(Condominium.id == condominium_id).first()
    if not condominium:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Condominium not found"
        )
    
    logo_url = save_upload_file(file, condominium_id, "logo")
    condominium.logo_url = logo_url
    db.commit()
    db.refresh(condominium)
    
    return condominium


@router.post("/{condominium_id}/upload-landscape", response_model=CondominiumResponse)
async def upload_landscape_image(
    condominium_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload landscape image for a condominium"""
    if not check_condominium_access(db, current_user, condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    condominium = db.query(Condominium).filter(Condominium.id == condominium_id).first()
    if not condominium:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Condominium not found"
        )
    
    landscape_url = save_upload_file(file, condominium_id, "landscape")
    condominium.landscape_image_url = landscape_url
    db.commit()
    db.refresh(condominium)
    
    return condominium


@router.post("/{condominium_id}/upload-logo", response_model=CondominiumResponse)
async def upload_logo(
    condominium_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload logo for a condominium"""
    if not check_condominium_access(db, current_user, condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    condominium = db.query(Condominium).filter(Condominium.id == condominium_id).first()
    if not condominium:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Condominium not found"
        )
    
    logo_url = save_upload_file(file, condominium_id, "logo")
    condominium.logo_url = logo_url
    db.commit()
    db.refresh(condominium)
    
    return condominium


@router.post("/{condominium_id}/upload-landscape", response_model=CondominiumResponse)
async def upload_landscape_image(
    condominium_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload landscape image for a condominium"""
    if not check_condominium_access(db, current_user, condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    condominium = db.query(Condominium).filter(Condominium.id == condominium_id).first()
    if not condominium:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Condominium not found"
        )
    
    landscape_url = save_upload_file(file, condominium_id, "landscape")
    condominium.landscape_image_url = landscape_url
    db.commit()
    db.refresh(condominium)
    
    return condominium


@router.get("/", response_model=List[CondominiumResponse])
async def get_condominiums(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all condominiums for current user"""
    # Check if user is admin - admins can see all condominiums
    from app.core.permissions import require_roles
    user_roles = [ur.role.name for ur in current_user.user_roles]
    is_admin = "admin" in user_roles
    
    if is_admin:
        # Admins can see all condominiums
        condominiums = db.query(Condominium).all()
    else:
        # Regular users only see their assigned condominiums
        user_condominiums = [uc.condominium_id for uc in current_user.user_condominiums]
        if not user_condominiums:
            return []
        condominiums = db.query(Condominium).filter(Condominium.id.in_(user_condominiums)).all()
    
    return condominiums


@router.get("/{condominium_id}", response_model=CondominiumResponse)
async def get_condominium(
    condominium_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific condominium"""
    if not check_condominium_access(db, current_user, condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    condominium = db.query(Condominium).filter(Condominium.id == condominium_id).first()
    if not condominium:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Condominium not found"
        )
    
    return condominium


@router.put("/{condominium_id}", response_model=CondominiumResponse)
async def update_condominium(
    condominium_id: int,
    condominium_data: CondominiumUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a condominium"""
    if not check_condominium_access(db, current_user, condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    # Check if user has admin role
    from app.core.permissions import Role
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if Role.ADMIN not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update condominiums"
        )
    
    condominium = db.query(Condominium).filter(Condominium.id == condominium_id).first()
    if not condominium:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Condominium not found"
        )
    
    update_data = condominium_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(condominium, field, value)
    
    db.commit()
    db.refresh(condominium)
    
    return condominium


@router.delete("/{condominium_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_condominium(
    condominium_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a condominium"""
    if not check_condominium_access(db, current_user, condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    # Check if user has admin role
    from app.core.permissions import Role
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if Role.ADMIN not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete condominiums"
        )
    
    condominium = db.query(Condominium).filter(Condominium.id == condominium_id).first()
    if not condominium:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Condominium not found"
        )
    
    db.delete(condominium)
    db.commit()
    
    return None

