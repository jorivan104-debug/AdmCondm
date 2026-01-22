from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.accounting import TransactionType, TransactionStatus, ExpenseType


class AccountingTransactionBase(BaseModel):
    type: TransactionType
    category: Optional[str] = None
    expense_type: Optional[ExpenseType] = None
    description: str
    amount: float
    transaction_date: datetime
    reference_number: Optional[str] = None
    property_id: Optional[int] = None


class AccountingTransactionCreate(AccountingTransactionBase):
    condominium_id: int


class AccountingTransactionUpdate(BaseModel):
    type: Optional[TransactionType] = None
    category: Optional[str] = None
    expense_type: Optional[ExpenseType] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    transaction_date: Optional[datetime] = None
    status: Optional[TransactionStatus] = None
    reference_number: Optional[str] = None
    property_id: Optional[int] = None


class AccountingTransactionResponse(AccountingTransactionBase):
    id: int
    condominium_id: int
    status: TransactionStatus
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BudgetBase(BaseModel):
    year: int
    category: str
    budgeted_amount: float
    description: Optional[str] = None


class BudgetCreate(BudgetBase):
    condominium_id: int


class BudgetUpdate(BaseModel):
    year: Optional[int] = None
    category: Optional[str] = None
    budgeted_amount: Optional[float] = None
    description: Optional[str] = None
    is_approved: Optional[bool] = None


class BudgetResponse(BudgetBase):
    id: int
    condominium_id: int
    is_approved: bool
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BankReconciliationBase(BaseModel):
    bank_name: str
    account_number: str
    statement_date: datetime
    opening_balance: float
    closing_balance: float
    notes: Optional[str] = None


class BankReconciliationCreate(BankReconciliationBase):
    condominium_id: int


class BankReconciliationResponse(BankReconciliationBase):
    id: int
    condominium_id: int
    reconciled_by: int
    reconciled_at: datetime

    class Config:
        from_attributes = True

