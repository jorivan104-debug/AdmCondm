from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.space_request import RequestStatus


class SpaceRequestBase(BaseModel):
    space_name: str
    request_date: datetime
    start_time: datetime
    end_time: datetime
    purpose: Optional[str] = None


class SpaceRequestCreate(SpaceRequestBase):
    condominium_id: int
    resident_id: int


class SpaceRequestUpdate(BaseModel):
    space_name: Optional[str] = None
    request_date: Optional[datetime] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    purpose: Optional[str] = None
    status: Optional[RequestStatus] = None
    rejection_reason: Optional[str] = None


class SpaceRequestResponse(SpaceRequestBase):
    id: int
    condominium_id: int
    resident_id: int
    status: RequestStatus
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

