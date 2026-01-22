from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class MeetingBase(BaseModel):
    title: str
    meeting_type: str
    scheduled_date: datetime
    location: Optional[str] = None
    agenda: Optional[str] = None


class MeetingCreate(MeetingBase):
    condominium_id: int


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    meeting_type: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    location: Optional[str] = None
    agenda: Optional[str] = None
    minutes: Optional[str] = None
    is_completed: Optional[bool] = None


class MeetingResponse(MeetingBase):
    id: int
    condominium_id: int
    minutes: Optional[str] = None
    is_completed: bool
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MeetingAttendanceBase(BaseModel):
    attended: bool = False
    vote: Optional[str] = None
    notes: Optional[str] = None


class MeetingAttendanceCreate(MeetingAttendanceBase):
    meeting_id: int
    resident_id: int


class MeetingAttendanceResponse(MeetingAttendanceBase):
    id: int
    meeting_id: int
    resident_id: int
    created_at: datetime

    class Config:
        from_attributes = True

