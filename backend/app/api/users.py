from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_password_hash
from app.core.permissions import can_manage_users, is_super_admin
from app.models.user import User, UserRole, UserCondominium
from app.models.role import Role
from app.models.condominium import Condominium
from app.schemas.user import (
    UserCreateAdmin,
    UserUpdateAdmin,
    UserDetailResponse,
    UserResponse,
    RoleResponse
)
from app.api.auth import get_current_user

router = APIRouter()


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
    """Get all users (super admin only)"""
    if not can_manage_users(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super administrators can view all users"
        )
    
    users = db.query(User).offset(skip).limit(limit).all()
    result = []
    for user in users:
        user_dict = {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
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
    """Get user by ID (super admin only)"""
    if not can_manage_users(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super administrators can view user details"
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
        "is_active": user.is_active,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "roles": get_user_roles(db, user.id),
        "condominiums": get_user_condominiums(db, user.id)
    }


@router.post("/", response_model=UserDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreateAdmin,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new user (super admin only)"""
    if not can_manage_users(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super administrators can create users"
        )
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
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
    
    db.commit()
    db.refresh(user)
    
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "roles": get_user_roles(db, user.id),
        "condominiums": get_user_condominiums(db, user.id)
    }


@router.put("/{user_id}", response_model=UserDetailResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdateAdmin,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user (super admin only)"""
    if not can_manage_users(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super administrators can update users"
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
    
    db.commit()
    db.refresh(user)
    
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "roles": get_user_roles(db, user.id),
        "condominiums": get_user_condominiums(db, user.id)
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
    
    db.delete(user)
    db.commit()
    return None


@router.get("/roles/all", response_model=List[RoleResponse])
async def get_all_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all available roles"""
    if not can_manage_users(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super administrators can view roles"
        )
    
    roles = db.query(Role).all()
    return [RoleResponse(id=role.id, name=role.name, description=role.description) for role in roles]
