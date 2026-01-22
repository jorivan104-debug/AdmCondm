from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class TransactionType(enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"


class TransactionStatus(enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ExpenseType(enum.Enum):
    """Types of expenses for property accounting"""
    ADMINISTRATION = "administration"  # Administración
    FINES = "fines"  # Multas
    SOCIAL_AREA_RENTAL = "social_area_rental"  # Alquiler de zona social


class AccountingTransaction(Base):
    __tablename__ = "accounting_transactions"

    id = Column(Integer, primary_key=True, index=True)
    condominium_id = Column(Integer, ForeignKey("condominiums.id"), nullable=False)
    type = Column(Enum(TransactionType), nullable=False)
    category = Column(String(100), nullable=True)
    expense_type = Column(Enum(ExpenseType), nullable=True)  # For property-specific expenses
    description = Column(Text, nullable=False)
    amount = Column(Float, nullable=False)
    transaction_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(Enum(TransactionStatus), default=TransactionStatus.PENDING)
    reference_number = Column(String(100), nullable=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=True)  # For property-specific transactions
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    condominium = relationship("Condominium", back_populates="accounting_transactions")


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    condominium_id = Column(Integer, ForeignKey("condominiums.id"), nullable=False)
    year = Column(Integer, nullable=False)
    category = Column(String(100), nullable=False)
    budgeted_amount = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    is_approved = Column(Boolean, default=False)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    condominium = relationship("Condominium", back_populates="budgets")


class BankReconciliation(Base):
    __tablename__ = "bank_reconciliations"

    id = Column(Integer, primary_key=True, index=True)
    condominium_id = Column(Integer, ForeignKey("condominiums.id"), nullable=False)
    bank_name = Column(String(255), nullable=False)
    account_number = Column(String(100), nullable=False)
    statement_date = Column(DateTime(timezone=True), nullable=False)
    opening_balance = Column(Float, nullable=False)
    closing_balance = Column(Float, nullable=False)
    reconciled_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    reconciled_at = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text, nullable=True)

    # Relationships
    condominium = relationship("Condominium")

