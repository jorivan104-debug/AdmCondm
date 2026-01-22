from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Condominium(Base):
    __tablename__ = "condominiums"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)  # Nombre completo
    short_name = Column(String(100), nullable=True)  # Nombre abreviado
    address = Column(Text, nullable=True)  # Ubicación completa
    city = Column(String(100), nullable=True)  # Ciudad
    state = Column(String(100), nullable=True)  # Estado/Departamento
    country = Column(String(100), nullable=True)  # País
    postal_code = Column(String(20), nullable=True)  # Código postal
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    nit = Column(String(50), nullable=True)
    administrator_name = Column(String(255), nullable=True)  # Nombre del administrador
    administrator_phone = Column(String(50), nullable=True)  # Teléfono del administrador
    administrator_email = Column(String(255), nullable=True)  # Email del administrador
    logo_url = Column(String(500), nullable=True)  # URL del logo
    landscape_image_url = Column(String(500), nullable=True)  # URL de imagen paisajística
    description = Column(Text, nullable=True)  # Descripción adicional
    total_units = Column(Integer, nullable=True)  # Total de unidades
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    properties = relationship("Property", back_populates="condominium", cascade="all, delete-orphan")
    residents = relationship("Resident", back_populates="condominium", cascade="all, delete-orphan")
    blocks = relationship("Block", back_populates="condominium", cascade="all, delete-orphan")
    user_condominiums = relationship("UserCondominium", back_populates="condominium", cascade="all, delete-orphan")
    document_attachments = relationship("DocumentAttachment", back_populates="condominium", cascade="all, delete-orphan")
    accounting_transactions = relationship("AccountingTransaction", back_populates="condominium", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="condominium", cascade="all, delete-orphan")
    space_requests = relationship("SpaceRequest", back_populates="condominium", cascade="all, delete-orphan")
    meetings = relationship("Meeting", back_populates="condominium", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="condominium", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="condominium", cascade="all, delete-orphan")

