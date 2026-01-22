from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None


class RoleResponse(RoleBase):
    id: int

    class Config:
        from_attributes = True


class UserWithRoles(UserResponse):
    roles: List[RoleResponse] = []
    condominiums: List[int] = []  # List of condominium IDs

    class Config:
        from_attributes = True


class UserCreateAdmin(UserBase):
    password: str
    role_ids: List[int] = []
    condominium_ids: List[int] = []


class UserUpdateAdmin(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    role_ids: Optional[List[int]] = None
    condominium_ids: Optional[List[int]] = None
    password: Optional[str] = None


class UserDetailResponse(UserResponse):
    roles: List[RoleResponse] = []
    condominiums: List[dict] = []  # List of condominium info

    class Config:
        from_attributes = True

