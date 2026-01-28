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
    photo_url: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    photo_url: Optional[str] = None
    phone: Optional[str] = None
    document_type: Optional[str] = None
    document_number: Optional[str] = None
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
  password: Optional[str] = None
  phone: Optional[str] = None
  document_type: Optional[str] = None
  document_number: Optional[str] = None
  role_ids: List[int] = []
  condominium_ids: List[int] = []
  
  class Config:
    # Allow password to be omitted from request
    json_schema_extra = {
      "example": {
        "email": "user@example.com",
        "full_name": "User Name",
        "password": None,
        "role_ids": [1],
        "condominium_ids": [1]
      }
    }


class UserUpdateAdmin(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    document_type: Optional[str] = None
    document_number: Optional[str] = None
    is_active: Optional[bool] = None
    role_ids: Optional[List[int]] = None
    condominium_ids: Optional[List[int]] = None
    password: Optional[str] = None


class CondominiumInfo(BaseModel):
    """Condominium with optional property_ids for titular/residente (units the user is associated to)."""
    id: int
    name: str
    property_ids: Optional[List[int]] = None  # Solo para titular/residente: unidades asociadas; [] = ninguna


class UserDetailResponse(UserResponse):
  roles: List[RoleResponse] = []
  condominiums: List[CondominiumInfo] = []  # Condominios; si titular/residente incluye property_ids
  needs_password_change: bool = False

  class Config:
      from_attributes = True

