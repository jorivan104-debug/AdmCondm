from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Assembly(Base):
    __tablename__ = "assemblies"

    id = Column(Integer, primary_key=True, index=True)
    condominium_id = Column(Integer, ForeignKey("condominiums.id"), nullable=False)
    assembly_number = Column(Integer, nullable=True)  # Número secuencial de asamblea por condominio
    title = Column(String(255), nullable=False)
    scheduled_date = Column(DateTime(timezone=True), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)  # Hora de inicio real de la asamblea
    location = Column(String(255), nullable=True)
    agenda = Column(Text, nullable=True)  # Orden del día
    minutes = Column(Text, nullable=True)  # Acta de la reunión (texto libre)
    required_quorum = Column(Float, nullable=False, default=50.0)  # Porcentaje requerido
    current_quorum = Column(Float, default=0.0)  # Porcentaje actual
    status = Column(String(50), default="scheduled")  # scheduled, in_progress, completed, cancelled
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    condominium = relationship("Condominium", back_populates="assemblies")
    votes = relationship("AssemblyVote", back_populates="assembly", cascade="all, delete-orphan")
    attendees = relationship("AssemblyAttendance", back_populates="assembly", cascade="all, delete-orphan")


class AssemblyVote(Base):
    __tablename__ = "assembly_votes"

    id = Column(Integer, primary_key=True, index=True)
    assembly_id = Column(Integer, ForeignKey("assemblies.id"), nullable=False)
    topic = Column(String(255), nullable=False)  # Tema o pregunta de votación
    description = Column(Text, nullable=True)
    vote_type = Column(String(50), default="custom")  # custom (opciones cerradas configuradas)
    options = Column(Text, nullable=True)  # JSON string con opciones: [{"label": "Opción", "color": "#FF0000", "key": "opcion1"}, ...]
    option_votes = Column(Text, nullable=True)  # JSON string con conteo por opción: {"opcion1": 5, "opcion2": 3, ...}
    total_votes = Column(Integer, default=0)
    yes_votes = Column(Integer, default=0)  # Mantener para compatibilidad
    no_votes = Column(Integer, default=0)  # Mantener para compatibilidad
    abstain_votes = Column(Integer, default=0)  # Mantener para compatibilidad
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    assembly = relationship("Assembly", back_populates="votes")
    vote_records = relationship("VoteRecord", back_populates="vote", cascade="all, delete-orphan")


class VoteRecord(Base):
    __tablename__ = "vote_records"

    id = Column(Integer, primary_key=True, index=True)
    vote_id = Column(Integer, ForeignKey("assembly_votes.id"), nullable=False)
    resident_id = Column(Integer, ForeignKey("residents.id"), nullable=False)
    vote_value = Column(String(50), nullable=False)  # yes, no, abstain, o valor de opción
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    vote = relationship("AssemblyVote", back_populates="vote_records")
    resident = relationship("Resident", back_populates="vote_records")


class AssemblyAttendance(Base):
    __tablename__ = "assembly_attendances"

    id = Column(Integer, primary_key=True, index=True)
    assembly_id = Column(Integer, ForeignKey("assemblies.id"), nullable=False)
    resident_id = Column(Integer, ForeignKey("residents.id"), nullable=False)
    attended = Column(Boolean, default=False)
    attendance_confirmed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    assembly = relationship("Assembly", back_populates="attendees")
    resident = relationship("Resident", back_populates="assembly_attendances")
