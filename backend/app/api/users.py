from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from pathlib import Path
import shutil
from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_password_hash
from app.core.permissions import can_manage_users, is_super_admin
from app.models.user import User, UserRole, UserCondominium
from app.models.role import Role
from app.models.condominium import Condominium
from app.models.resident import Resident
from app.schemas.user import (
    UserCreateAdmin,
    UserUpdateAdmin,
    UserDetailResponse,
    UserResponse,
    RoleResponse
)
from app.api.auth import get_current_user

router = APIRouter()

# Directorio para fotos de usuarios (admin sube foto de cualquier usuario)
UPLOAD_DIR = Path(settings.UPLOAD_DIR)
UPLOAD_DIR.mkdir(exist_ok=True)
USER_UPLOAD_DIR = UPLOAD_DIR / "users"
USER_UPLOAD_DIR.mkdir(exist_ok=True)


def _save_user_photo(file: UploadFile, target_user_id: int) -> str:
    """Guarda la foto subida y devuelve la URL."""
    file_ext = Path(file.filename or "photo").suffix or ".jpg"
    filename = f"photo_{target_user_id}{file_ext}"
    file_path = USER_UPLOAD_DIR / filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return f"/uploads/users/{filename}"


def get_user_roles(db: Session, user_id: int) -> List[RoleResponse]:
    """Get user roles"""
    user_roles = db.query(UserRole).filter(UserRole.user_id == user_id).all()
    return [RoleResponse(id=ur.role.id, name=ur.role.name, description=ur.role.description) 
            for ur in user_roles]


def get_user_condominiums(db: Session, user_id: int) -> List[dict]:
    """Get user condominiums"""
    user_condos = db.query(UserCondominium).filter(UserCondominium.user_id == user_id).all()
    return [{"id": uc.condominium.id, "name": uc.condominium.name} 
            for uc in user_condos]


@router.get("/", response_model=List[UserDetailResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all users (super admin or admin only)"""
    from app.core.permissions import is_super_admin
    user_roles = [ur.role.name for ur in current_user.user_roles]
    is_admin = is_super_admin(current_user) or "admin" in user_roles
    
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view all users"
        )
    
    users = db.query(User).offset(skip).limit(limit).all()
    result = []
    for user in users:
        user_dict = {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "photo_url": user.photo_url,
            "phone": user.phone,
            "document_type": user.document_type,
            "document_number": user.document_number,
            "is_active": user.is_active,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
            "roles": get_user_roles(db, user.id),
            "condominiums": get_user_condominiums(db, user.id)
        }
        result.append(user_dict)
    return result


@router.get("/{user_id}", response_model=UserDetailResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user by ID (super admin or admin only)"""
    from app.core.permissions import is_super_admin
    user_roles = [ur.role.name for ur in current_user.user_roles]
    is_admin = is_super_admin(current_user) or "admin" in user_roles
    
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view user details"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "photo_url": user.photo_url,
        "phone": user.phone,
        "document_type": user.document_type,
        "document_number": user.document_number,
        "is_active": user.is_active,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "roles": get_user_roles(db, user.id),
        "condominiums": get_user_condominiums(db, user.id),
        "needs_password_change": not bool(user.hashed_password)
    }


@router.post("/", response_model=UserDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreateAdmin,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new user (super admin or admin only)"""
    from app.core.permissions import is_super_admin
    user_roles = [ur.role.name for ur in current_user.user_roles]
    is_admin = is_super_admin(current_user) or "admin" in user_roles
    
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create users"
        )
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    try:
        # Create user (with or without password)
        hashed_password = None
        if user_data.password and user_data.password.strip():
            hashed_password = get_password_hash(user_data.password)
        
        user = User(
            email=user_data.email,
            hashed_password=hashed_password,  # Can be None for new users
            full_name=user_data.full_name,
            phone=user_data.phone,
            document_type=user_data.document_type,
            document_number=user_data.document_number,
            is_active=True
        )
        db.add(user)
        db.flush()
        
        # Assign roles
        if user_data.role_ids:
            for role_id in user_data.role_ids:
                role = db.query(Role).filter(Role.id == role_id).first()
                if role:
                    user_role = UserRole(user_id=user.id, role_id=role_id)
                    db.add(user_role)
        
        # Assign condominiums
        if user_data.condominium_ids:
            for condominium_id in user_data.condominium_ids:
                condominium = db.query(Condominium).filter(Condominium.id == condominium_id).first()
                if condominium:
                    user_condo = UserCondominium(user_id=user.id, condominium_id=condominium_id)
                    db.add(user_condo)
        
        # Si el usuario tiene rol titular o residente, crearlo como Resident en cada condominio asignado
        role_names = set()
        for role_id in (user_data.role_ids or []):
            r = db.query(Role).filter(Role.id == role_id).first()
            if r:
                role_names.add(r.name)
        if role_names & {"titular", "residente"} and user_data.condominium_ids:
            full_name = (user.full_name or user.email or "").strip() or "Sin nombre"
            for condominium_id in user_data.condominium_ids:
                existing = db.query(Resident).filter(
                    Resident.user_id == user.id, Resident.condominium_id == condominium_id
                ).first()
                if not existing:
                    db.add(Resident(
                        user_id=user.id,
                        condominium_id=condominium_id,
                        full_name=full_name,
                        email=user.email,
                        phone=user.phone,
                        document_type=user.document_type,
                        document_number=user.document_number,
                    ))
        
        db.commit()
        db.refresh(user)
    except Exception as e:
        db.rollback()
        import traceback
        error_details = traceback.format_exc()
        print(f"[ERROR] Error creating user: {e}")
        print(f"[ERROR] Details: {error_details}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear usuario: {str(e)}"
        )
    
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "photo_url": user.photo_url,
        "phone": user.phone,
        "document_type": user.document_type,
        "document_number": user.document_number,
        "is_active": user.is_active,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "roles": get_user_roles(db, user.id),
        "condominiums": get_user_condominiums(db, user.id),
        "needs_password_change": not bool(user.hashed_password)
    }


@router.put("/{user_id}", response_model=UserDetailResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdateAdmin,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user (super admin or admin only)"""
    from app.core.permissions import is_super_admin
    user_roles = [ur.role.name for ur in current_user.user_roles]
    is_admin = is_super_admin(current_user) or "admin" in user_roles
    
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update users"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update user fields
    if user_data.email is not None:
        # Check if email is already taken by another user
        existing_user = db.query(User).filter(User.email == user_data.email, User.id != user_id).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        user.email = user_data.email
    
    if user_data.full_name is not None:
        user.full_name = user_data.full_name
    
    if user_data.phone is not None:
        user.phone = user_data.phone
    if user_data.document_type is not None:
        user.document_type = user_data.document_type
    if user_data.document_number is not None:
        user.document_number = user_data.document_number
    
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
    
    if user_data.password is not None:
        user.hashed_password = get_password_hash(user_data.password)
    
    # Update roles
    if user_data.role_ids is not None:
        # Remove existing roles
        db.query(UserRole).filter(UserRole.user_id == user_id).delete()
        # Add new roles
        for role_id in user_data.role_ids:
            role = db.query(Role).filter(Role.id == role_id).first()
            if role:
                user_role = UserRole(user_id=user_id, role_id=role_id)
                db.add(user_role)
    
    # Update condominiums
    if user_data.condominium_ids is not None:
        # Remove existing condominiums
        db.query(UserCondominium).filter(UserCondominium.user_id == user_id).delete()
        # Add new condominiums
        for condominium_id in user_data.condominium_ids:
            condominium = db.query(Condominium).filter(Condominium.id == condominium_id).first()
            if condominium:
                user_condo = UserCondominium(user_id=user_id, condominium_id=condominium_id)
                db.add(user_condo)
    
    # Si el usuario tiene rol titular o residente, asegurar Resident en cada condominio asignado
    effective_role_ids = (
        user_data.role_ids
        if user_data.role_ids is not None
        else [ur.role_id for ur in db.query(UserRole).filter(UserRole.user_id == user_id).all()]
    )
    effective_condo_ids = (
        user_data.condominium_ids
        if user_data.condominium_ids is not None
        else [uc.condominium_id for uc in db.query(UserCondominium).filter(UserCondominium.user_id == user_id).all()]
    )
    role_names = set()
    for rid in effective_role_ids:
        r = db.query(Role).filter(Role.id == rid).first()
        if r:
            role_names.add(r.name)
    if role_names & {"titular", "residente"} and effective_condo_ids:
        full_name = (user.full_name or user.email or "").strip() or "Sin nombre"
        for condominium_id in effective_condo_ids:
            existing = db.query(Resident).filter(
                Resident.user_id == user_id, Resident.condominium_id == condominium_id
            ).first()
            if not existing:
                db.add(Resident(
                    user_id=user_id,
                    condominium_id=condominium_id,
                    full_name=full_name,
                    email=user.email,
                    phone=user.phone,
                    document_type=user.document_type,
                    document_number=user.document_number,
                ))
    
    db.commit()
    db.refresh(user)
    
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "photo_url": user.photo_url,
        "phone": user.phone,
        "document_type": user.document_type,
        "document_number": user.document_number,
        "is_active": user.is_active,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "roles": get_user_roles(db, user.id),
        "condominiums": get_user_condominiums(db, user.id),
        "needs_password_change": not bool(user.hashed_password)
    }


@router.post("/{user_id}/upload-photo", response_model=UserDetailResponse)
async def upload_user_photo(
    user_id: int,
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Subir foto de un usuario (solo admin o super_admin)."""
    from app.core.permissions import is_super_admin
    user_roles = [ur.role.name for ur in current_user.user_roles]
    is_admin = is_super_admin(current_user) or "admin" in user_roles
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden subir fotos de usuarios"
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    photo_url = _save_user_photo(photo, user_id)
    user.photo_url = photo_url
    db.commit()
    db.refresh(user)
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "photo_url": user.photo_url,
        "phone": user.phone,
        "document_type": user.document_type,
        "document_number": user.document_number,
        "is_active": user.is_active,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "roles": get_user_roles(db, user.id),
        "condominiums": get_user_condominiums(db, user.id),
        "needs_password_change": not bool(user.hashed_password)
    }


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete user (super admin only)"""
    if not can_manage_users(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super administrators can delete users"
        )
    
    # Prevent deleting yourself
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Roles del usuario a eliminar
    role_names = set()
    for ur in db.query(UserRole).filter(UserRole.user_id == user_id).all():
        r = db.query(Role).filter(Role.id == ur.role_id).first()
        if r:
            role_names.add(r.name)
    residents_linked = db.query(Resident).filter(Resident.user_id == user_id).all()
    if role_names & {"titular", "residente"}:
        # Si es titular o residente, borrar también los Resident asociados
        for r in residents_linked:
            db.delete(r)
    else:
        # En otros casos solo desvincular (evita violación de FK)
        db.query(Resident).filter(Resident.user_id == user_id).update({Resident.user_id: None})
    db.delete(user)
    db.commit()
    return None


@router.post("/{user_id}/reset-password")
async def reset_user_password(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reset user password to a temporary password (super admin or admin only)"""
    from app.core.permissions import is_super_admin
    user_roles = [ur.role.name for ur in current_user.user_roles]
    is_admin = is_super_admin(current_user) or "admin" in user_roles
    
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can reset passwords"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Generate temporary password (user should change it on first login)
    import secrets
    import string
    temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
    user.hashed_password = get_password_hash(temp_password)
    
    db.commit()
    db.refresh(user)
    
    from fastapi.responses import JSONResponse
    return JSONResponse({
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        "roles": [{"id": r.id, "name": r.name, "description": r.description} for r in get_user_roles(db, user.id)],
        "condominiums": get_user_condominiums(db, user.id),
        "temp_password": temp_password  # Include in response for display
    })


@router.get("/roles/all", response_model=List[RoleResponse])
async def get_all_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all available roles"""
    from app.core.permissions import is_super_admin
    user_roles = [ur.role.name for ur in current_user.user_roles]
    is_admin = is_super_admin(current_user) or "admin" in user_roles
    
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view roles"
        )
    
    roles = db.query(Role).all()
    return [RoleResponse(id=role.id, name=role.name, description=role.description) for role in roles]
