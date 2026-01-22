from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class AttachmentEntityType(str, enum.Enum):
    """Tipos de entidades a las que se pueden adjuntar documentos"""
    RESIDENT = "resident"
    PROPERTY = "property"


class DocumentAttachment(Base):
    __tablename__ = "document_attachments"

    id = Column(Integer, primary_key=True, index=True)
    condominium_id = Column(Integer, ForeignKey("condominiums.id"), nullable=False)
    entity_type = Column(SQLEnum(AttachmentEntityType), nullable=False)  # resident o property
    entity_id = Column(Integer, nullable=False)  # ID del residente o propiedad
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    condominium = relationship("Condominium", back_populates="document_attachments")

