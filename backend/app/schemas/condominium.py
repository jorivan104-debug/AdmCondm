from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CondominiumBase(BaseModel):
    name: str  # Nombre completo
    short_name: Optional[str] = None  # Nombre abreviado
    address: Optional[str] = None  # Dirección completa
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    nit: Optional[str] = None
    administrator_name: Optional[str] = None
    administrator_phone: Optional[str] = None
    administrator_email: Optional[str] = None
    logo_url: Optional[str] = None
    landscape_image_url: Optional[str] = None
    description: Optional[str] = None
    total_units: Optional[int] = None
    administration_value_type: Optional[str] = None  # 'global' | 'segmentado'
    administration_value_cop: Optional[int] = None  # Valor en COP cuando type=global


class CondominiumCreate(CondominiumBase):
    pass


class CondominiumUpdate(BaseModel):
    name: Optional[str] = None
    short_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    nit: Optional[str] = None
    administrator_name: Optional[str] = None
    administrator_phone: Optional[str] = None
    administrator_email: Optional[str] = None
    logo_url: Optional[str] = None
    landscape_image_url: Optional[str] = None
    description: Optional[str] = None
    total_units: Optional[int] = None
    administration_value_type: Optional[str] = None  # 'global' | 'segmentado'
    administration_value_cop: Optional[int] = None  # Valor en COP cuando type=global


class CondominiumResponse(CondominiumBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

