from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    condominium_id = Column(Integer, ForeignKey("condominiums.id"), nullable=False)
    block_id = Column(Integer, ForeignKey("blocks.id"), nullable=True)  # Bloque o manzana
    code = Column(String(50), nullable=False)  # Apto 101, Casa 5, Local 10, etc.
    type = Column(String(50), nullable=False)  # apartment, house, commercial, etc.
    area = Column(Float, nullable=True)  # Area in square meters
    description = Column(Text, nullable=True)  # Descripción de la unidad
    photo_url = Column(String(500), nullable=True)  # URL de la foto
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    condominium = relationship("Condominium", back_populates="properties")
    block = relationship("Block", back_populates="properties")
    property_residents = relationship("PropertyResident", back_populates="property", cascade="all, delete-orphan")
    administration_invoices = relationship("AdministrationInvoice", back_populates="property", cascade="all, delete-orphan")


class PropertyResident(Base):
    __tablename__ = "property_residents"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    resident_id = Column(Integer, ForeignKey("residents.id"), nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=True)  # NULL means current owner
    ownership_percentage = Column(Float, default=100.0)  # For co-ownership
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    property = relationship("Property", back_populates="property_residents")
    resident = relationship("Resident", back_populates="property_residents")

