from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class PropertyBase(BaseModel):
    code: str
    type: str
    block_id: Optional[int] = None
    area: Optional[float] = None
    description: Optional[str] = None


class PropertyCreate(PropertyBase):
    condominium_id: int


class PropertyUpdate(BaseModel):
    code: Optional[str] = None
    type: Optional[str] = None
    block_id: Optional[int] = None
    area: Optional[float] = None
    description: Optional[str] = None


class PropertyResidentAssignment(BaseModel):
    """Schema para asignar un residente a una propiedad al crearla"""
    resident_id: int
    is_owner: bool = False  # Indica si es el titular
    ownership_percentage: float = 100.0


class PropertyResidentBase(BaseModel):
    start_date: datetime
    end_date: Optional[datetime] = None
    ownership_percentage: float = 100.0


class PropertyResidentCreate(PropertyResidentBase):
    property_id: int
    resident_id: int


class PropertyResidentResponse(PropertyResidentBase):
    id: int
    property_id: int
    resident_id: int
    created_at: datetime
    resident: Optional["ResidentResponse"] = None

    class Config:
        from_attributes = True


class PropertyResponse(PropertyBase):
    id: int
    condominium_id: int
    photo_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    block: Optional["BlockResponse"] = None
    property_residents: Optional[List["PropertyResidentResponse"]] = None

    class Config:
        from_attributes = True


# Forward reference resolution
from app.schemas.block import BlockResponse
from app.schemas.resident import ResidentResponse

# Rebuild models after all definitions
PropertyResidentResponse.model_rebuild()
PropertyResponse.model_rebuild()

