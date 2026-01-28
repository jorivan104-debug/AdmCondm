from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class AssemblyBase(BaseModel):
    title: str
    scheduled_date: datetime
    location: Optional[str] = None
    agenda: Optional[str] = None  # Orden del día
    minutes: Optional[str] = None  # Acta de la reunión
    required_quorum: float = 50.0  # Porcentaje requerido


class AssemblyCreate(AssemblyBase):
    condominium_id: int


class AssemblyUpdate(BaseModel):
    title: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    location: Optional[str] = None
    agenda: Optional[str] = None
    minutes: Optional[str] = None  # Acta de la reunión
    required_quorum: Optional[float] = None
    status: Optional[str] = None  # scheduled, in_progress, completed, cancelled
    is_active: Optional[bool] = None


class AssemblyResponse(AssemblyBase):
    id: int
    condominium_id: int
    assembly_number: Optional[int] = None
    current_quorum: float
    status: str
    started_at: Optional[datetime] = None
    is_active: bool
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class VoteOption(BaseModel):
    label: str
    color: str  # Color primario en formato hex (#FF0000)
    key: str  # Clave única para identificar la opción

class AssemblyVoteBase(BaseModel):
    topic: str
    description: Optional[str] = None
    vote_type: str = "custom"  # custom (opciones cerradas)
    options: Optional[str] = None  # JSON string con array de VoteOption


class AssemblyVoteCreate(AssemblyVoteBase):
    assembly_id: int


class AssemblyVoteUpdate(BaseModel):
    topic: Optional[str] = None
    description: Optional[str] = None
    vote_type: Optional[str] = None
    options: Optional[str] = None
    is_active: Optional[bool] = None


class AssemblyVoteResponse(AssemblyVoteBase):
    id: int
    assembly_id: int
    total_votes: int
    yes_votes: int
    no_votes: int
    abstain_votes: int
    option_votes: Optional[str] = None  # JSON string con conteo por opción
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class VoteRecordCreate(BaseModel):
    vote_id: int
    resident_id: int
    vote_value: str  # yes, no, abstain, o valor de opción


class VoteRecordResponse(BaseModel):
    id: int
    vote_id: int
    resident_id: int
    vote_value: str
    created_at: datetime

    class Config:
        from_attributes = True


class AssemblyAttendanceCreate(BaseModel):
    assembly_id: int
    resident_id: int
    attended: bool = False


class AssemblyAttendanceResponse(BaseModel):
    id: int
    assembly_id: int
    resident_id: int
    attended: bool
    attendance_confirmed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AssemblyDetailResponse(AssemblyResponse):
    votes: List[AssemblyVoteResponse] = []
    attendees: List[AssemblyAttendanceResponse] = []

    class Config:
        from_attributes = True
