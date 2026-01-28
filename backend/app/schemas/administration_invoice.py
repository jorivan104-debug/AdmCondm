from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class AdministrationInvoiceBase(BaseModel):
    property_id: int
    month: int  # 1-12
    year: int
    issue_date: datetime
    due_date: datetime
    base_amount: float
    additional_charges: float = 0.0
    discounts: float = 0.0
    total_amount: float
    description: Optional[str] = None
    notes: Optional[str] = None


class AdministrationInvoiceCreate(AdministrationInvoiceBase):
    condominium_id: int


class AdministrationInvoiceUpdate(BaseModel):
    month: Optional[int] = None
    year: Optional[int] = None
    issue_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    base_amount: Optional[float] = None
    additional_charges: Optional[float] = None
    discounts: Optional[float] = None
    total_amount: Optional[float] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class AdministrationInvoiceResponse(AdministrationInvoiceBase):
    id: int
    condominium_id: int
    invoice_number: str
    paid_amount: float
    pending_amount: float
    status: str
    is_active: bool
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InvoicePaymentBase(BaseModel):
    amount: float
    payment_date: datetime
    payment_method: str
    reference_number: Optional[str] = None
    notes: Optional[str] = None


class InvoicePaymentCreate(InvoicePaymentBase):
    invoice_id: int


class InvoicePaymentUpdate(BaseModel):
    amount: Optional[float] = None
    payment_date: Optional[datetime] = None
    payment_method: Optional[str] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None


class InvoicePaymentResponse(InvoicePaymentBase):
    id: int
    invoice_id: int
    recorded_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AdministrationInvoiceDetailResponse(AdministrationInvoiceResponse):
    payments: List[InvoicePaymentResponse] = []

    class Config:
        from_attributes = True


class GenerateBillingRequest(BaseModel):
    """Request body for generate-billing endpoint."""
    month: int  # 1-12
    year: int
    method: str  # 'global' | 'block' | 'unit'
    base_amount: float = 0.0
    due_days: int = 15
    block_id: Optional[int] = None  # required when method=block
    property_ids: Optional[List[int]] = None  # required when method=unit


class GenerateBillingResponse(BaseModel):
    """Response for generate-billing: created invoices and skipped property ids."""
    created: List[AdministrationInvoiceResponse] = []
    skipped_property_ids: List[int] = []
    message: str = ""
