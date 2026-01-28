from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class InvoiceStatus(enum.Enum):
    PENDING = "pending"  # Pendiente de pago
    PARTIAL = "partial"  # Pago parcial
    PAID = "paid"  # Pagada completamente
    OVERDUE = "overdue"  # Vencida
    CANCELLED = "cancelled"  # Cancelada


class PaymentMethod(enum.Enum):
    CASH = "cash"  # Efectivo
    BANK_TRANSFER = "bank_transfer"  # Transferencia bancaria
    CHECK = "check"  # Cheque
    CARD = "card"  # Tarjeta
    OTHER = "other"  # Otro


class AdministrationInvoice(Base):
    __tablename__ = "administration_invoices"

    id = Column(Integer, primary_key=True, index=True)
    condominium_id = Column(Integer, ForeignKey("condominiums.id"), nullable=False)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    invoice_number = Column(String(100), nullable=False, unique=True)  # Número de factura único
    month = Column(Integer, nullable=False)  # Mes (1-12)
    year = Column(Integer, nullable=False)  # Año
    issue_date = Column(DateTime(timezone=True), nullable=False)  # Fecha de emisión
    due_date = Column(DateTime(timezone=True), nullable=False)  # Fecha de vencimiento
    base_amount = Column(Float, nullable=False)  # Monto base de administración
    additional_charges = Column(Float, default=0.0)  # Cargos adicionales (multas, etc.)
    discounts = Column(Float, default=0.0)  # Descuentos
    total_amount = Column(Float, nullable=False)  # Monto total
    paid_amount = Column(Float, default=0.0)  # Monto pagado
    pending_amount = Column(Float, nullable=False)  # Monto pendiente
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.PENDING)
    description = Column(Text, nullable=True)  # Descripción adicional
    notes = Column(Text, nullable=True)  # Notas internas
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    condominium = relationship("Condominium", back_populates="administration_invoices")
    property = relationship("Property", back_populates="administration_invoices")
    payments = relationship("InvoicePayment", back_populates="invoice", cascade="all, delete-orphan")


class InvoicePayment(Base):
    __tablename__ = "invoice_payments"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("administration_invoices.id"), nullable=False)
    amount = Column(Float, nullable=False)  # Monto del pago
    payment_date = Column(DateTime(timezone=True), nullable=False)  # Fecha del pago
    payment_method = Column(Enum(PaymentMethod), nullable=False)  # Método de pago
    reference_number = Column(String(100), nullable=True)  # Número de referencia (transferencia, cheque, etc.)
    notes = Column(Text, nullable=True)  # Notas sobre el pago
    recorded_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # Usuario que registró el pago
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    invoice = relationship("AdministrationInvoice", back_populates="payments")
    recorder = relationship("User")
