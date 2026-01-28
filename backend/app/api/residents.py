from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import shutil
from pathlib import Path
from app.core.database import get_db
from app.core.permissions import check_condominium_access, Role
from app.core.config import settings
from app.models.resident import Resident
from app.models.condominium import Condominium
from app.models.user import User
from app.api.auth import get_current_user
from app.schemas.resident import ResidentCreate, ResidentUpdate, ResidentResponse

router = APIRouter()

# Ensure upload directory exists
UPLOAD_DIR = Path(settings.UPLOAD_DIR)
UPLOAD_DIR.mkdir(exist_ok=True)
RESIDENT_UPLOAD_DIR = UPLOAD_DIR / "residents"
RESIDENT_UPLOAD_DIR.mkdir(exist_ok=True)


def save_resident_photo(file: UploadFile, resident_id: int) -> str:
    """Save uploaded resident photo and return URL"""
    file_ext = Path(file.filename).suffix
    filename = f"photo_{resident_id}{file_ext}"
    file_path = RESIDENT_UPLOAD_DIR / filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return f"/uploads/residents/{filename}"


@router.post("/", response_model=ResidentResponse, status_code=status.HTTP_201_CREATED)
async def create_resident(
    resident_data: ResidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new resident"""
    # Check condominium access
    if not check_condominium_access(db, current_user, resident_data.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    # Check if user has admin or super_admin role
    user_roles = [ur.role.name for ur in (current_user.user_roles or []) if getattr(ur, 'role', None)]
    if Role.ADMIN not in user_roles and Role.SUPER_ADMIN not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create residents"
        )
    
    # Verify condominium exists
    condominium = db.query(Condominium).filter(Condominium.id == resident_data.condominium_id).first()
    if not condominium:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Condominium not found"
        )
    
    resident = Resident(**resident_data.model_dump())
    db.add(resident)
    db.commit()
    db.refresh(resident)
    
    return resident


@router.post("/create-complete", response_model=ResidentResponse, status_code=status.HTTP_201_CREATED)
async def create_resident_complete(
    condominium_id: int = Form(...),
    full_name: str = Form(...),
    email: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    document_type: Optional[str] = Form(None),
    document_number: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new resident with photo in one operation"""
    # Check condominium access
    if not check_condominium_access(db, current_user, condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    # Check if user has admin or super_admin role
    user_roles = [ur.role.name for ur in (current_user.user_roles or []) if getattr(ur, 'role', None)]
    if Role.ADMIN not in user_roles and Role.SUPER_ADMIN not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create residents"
        )
    
    # Verify condominium exists
    condominium = db.query(Condominium).filter(Condominium.id == condominium_id).first()
    if not condominium:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Condominium not found"
        )
    
    # Create resident
    resident = Resident(
        condominium_id=condominium_id,
        full_name=full_name,
        email=email,
        phone=phone,
        document_type=document_type,
        document_number=document_number
    )
    db.add(resident)
    db.commit()
    db.refresh(resident)
    
    # Upload photo if provided
    if photo:
        photo_url = save_resident_photo(photo, resident.id)
        resident.photo_url = photo_url
        db.commit()
        db.refresh(resident)
    
    return resident


@router.get("/condominium/{condominium_id}", response_model=List[ResidentResponse])
async def get_residents_by_condominium(
    condominium_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all residents for a condominium"""
    if not check_condominium_access(db, current_user, condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    residents = db.query(Resident).filter(Resident.condominium_id == condominium_id).all()
    return residents


@router.get("/{resident_id}", response_model=ResidentResponse)
async def get_resident(
    resident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific resident"""
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resident not found"
        )
    
    if not check_condominium_access(db, current_user, resident.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this resident"
        )
    
    return resident


@router.put("/{resident_id}", response_model=ResidentResponse)
async def update_resident(
    resident_id: int,
    resident_data: ResidentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a resident"""
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resident not found"
        )
    
    if not check_condominium_access(db, current_user, resident.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this resident"
        )
    
    # Check if user has admin or super_admin role
    user_roles = [ur.role.name for ur in (current_user.user_roles or []) if getattr(ur, 'role', None)]
    if Role.ADMIN not in user_roles and Role.SUPER_ADMIN not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update residents"
        )
    
    update_data = resident_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(resident, field, value)
    
    db.commit()
    db.refresh(resident)
    
    return resident


@router.delete("/{resident_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resident(
    resident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a resident"""
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resident not found"
        )
    
    if not check_condominium_access(db, current_user, resident.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this resident"
        )
    
    # Check if user has admin or super_admin role
    user_roles = [ur.role.name for ur in (current_user.user_roles or []) if getattr(ur, 'role', None)]
    if Role.ADMIN not in user_roles and Role.SUPER_ADMIN not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete residents"
        )
    
    db.delete(resident)
    db.commit()
    
    return None

