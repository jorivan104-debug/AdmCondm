from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    condominium_id = Column(Integer, ForeignKey("condominiums.id"), nullable=False)
    title = Column(String(255), nullable=False)
    meeting_type = Column(String(50), nullable=False)  # assembly, board_meeting, etc.
    scheduled_date = Column(DateTime(timezone=True), nullable=False)
    location = Column(String(255), nullable=True)
    agenda = Column(Text, nullable=True)
    minutes = Column(Text, nullable=True)
    is_completed = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    condominium = relationship("Condominium", back_populates="meetings")
    attendances = relationship("MeetingAttendance", back_populates="meeting", cascade="all, delete-orphan")


class MeetingAttendance(Base):
    __tablename__ = "meeting_attendances"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False)
    resident_id = Column(Integer, ForeignKey("residents.id"), nullable=False)
    attended = Column(Boolean, default=False)
    vote = Column(String(50), nullable=True)  # yes, no, abstain
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    meeting = relationship("Meeting", back_populates="attendances")
    resident = relationship("Resident", back_populates="meeting_attendances")

