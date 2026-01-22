from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Resident(Base):
    __tablename__ = "residents"

    id = Column(Integer, primary_key=True, index=True)
    condominium_id = Column(Integer, ForeignKey("condominiums.id"), nullable=False)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    document_type = Column(String(50), nullable=True)  # CC, NIT, etc.
    document_number = Column(String(50), nullable=True)
    photo_url = Column(String(500), nullable=True)  # URL de la foto
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Link to User if has account
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    condominium = relationship("Condominium", back_populates="residents")
    property_residents = relationship("PropertyResident", back_populates="resident", cascade="all, delete-orphan")
    space_requests = relationship("SpaceRequest", back_populates="resident", cascade="all, delete-orphan")
    meeting_attendances = relationship("MeetingAttendance", back_populates="resident", cascade="all, delete-orphan")

