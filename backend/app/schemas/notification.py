from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NotificationBase(BaseModel):
    title: str
    message: str
    notification_type: str


class NotificationCreate(NotificationBase):
    condominium_id: int
    user_id: Optional[int] = None  # None means broadcast to all


class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None


class NotificationResponse(NotificationBase):
    id: int
    condominium_id: int
    is_read: bool
    user_id: Optional[int] = None
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True

