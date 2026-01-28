from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from datetime import datetime, date, timedelta
from app.core.database import get_db
from app.core.permissions import check_condominium_access, can_access_accounting, Role
from app.models.administration_invoice import (
    AdministrationInvoice,
    InvoicePayment,
    InvoiceStatus,
    PaymentMethod
)
from app.models.condominium import Condominium
from app.models.property import Property
from app.models.block import Block
from app.models.user import User
from app.api.auth import get_current_user
from app.schemas.administration_invoice import (
    AdministrationInvoiceCreate,
    AdministrationInvoiceUpdate,
    AdministrationInvoiceResponse,
    AdministrationInvoiceDetailResponse,
    InvoicePaymentCreate,
    InvoicePaymentUpdate,
    InvoicePaymentResponse,
    GenerateBillingRequest,
    GenerateBillingResponse,
)

router = APIRouter()


def generate_invoice_number(condominium_id: int, month: int, year: int, property_code: str) -> str:
    """Generate unique invoice number"""
    return f"ADM-{condominium_id}-{year}{month:02d}-{property_code}"


def update_invoice_status(invoice: AdministrationInvoice):
    """Update invoice status based on payments"""
    if invoice.paid_amount <= 0:
        invoice.status = InvoiceStatus.PENDING
    elif invoice.paid_amount >= invoice.total_amount:
        invoice.status = InvoiceStatus.PAID
        invoice.pending_amount = 0.0
    else:
        invoice.status = InvoiceStatus.PARTIAL
        invoice.pending_amount = invoice.total_amount - invoice.paid_amount
    
    # Check if overdue
    if invoice.status in [InvoiceStatus.PENDING, InvoiceStatus.PARTIAL]:
        if datetime.utcnow().date() > invoice.due_date.date():
            invoice.status = InvoiceStatus.OVERDUE


@router.post("/", response_model=AdministrationInvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    invoice_data: AdministrationInvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new administration invoice"""
    if not check_condominium_access(db, current_user, invoice_data.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    if not can_access_accounting(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to accounting module"
        )
    
    # Verify property belongs to condominium
    property_obj = db.query(Property).filter(
        Property.id == invoice_data.property_id,
        Property.condominium_id == invoice_data.condominium_id
    ).first()
    
    if not property_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found in this condominium"
        )
    
    # Check if invoice already exists for this property, month and year
    existing = db.query(AdministrationInvoice).filter(
        AdministrationInvoice.condominium_id == invoice_data.condominium_id,
        AdministrationInvoice.property_id == invoice_data.property_id,
        AdministrationInvoice.month == invoice_data.month,
        AdministrationInvoice.year == invoice_data.year,
        AdministrationInvoice.is_active == True
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invoice already exists for property {property_obj.code} for {invoice_data.month}/{invoice_data.year}"
        )
    
    # Generate invoice number
    invoice_number = generate_invoice_number(
        invoice_data.condominium_id,
        invoice_data.month,
        invoice_data.year,
        property_obj.code
    )
    
    # Calculate pending amount
    pending_amount = invoice_data.total_amount - invoice_data.discounts
    
    invoice = AdministrationInvoice(
        **invoice_data.model_dump(),
        invoice_number=invoice_number,
        paid_amount=0.0,
        pending_amount=pending_amount,
        status=InvoiceStatus.PENDING,
        created_by=current_user.id
    )
    
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    
    return invoice


@router.get("/condominium/{condominium_id}", response_model=List[AdministrationInvoiceResponse])
async def get_invoices(
    condominium_id: int,
    property_id: Optional[int] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all invoices for a condominium with optional filters"""
    if not check_condominium_access(db, current_user, condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    if not can_access_accounting(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to accounting module"
        )
    
    query = db.query(AdministrationInvoice).filter(
        AdministrationInvoice.condominium_id == condominium_id,
        AdministrationInvoice.is_active == True
    )
    
    if property_id:
        query = query.filter(AdministrationInvoice.property_id == property_id)
    if month:
        query = query.filter(AdministrationInvoice.month == month)
    if year:
        query = query.filter(AdministrationInvoice.year == year)
    if status_filter:
        query = query.filter(AdministrationInvoice.status == status_filter)
    
    invoices = query.order_by(
        AdministrationInvoice.year.desc(),
        AdministrationInvoice.month.desc(),
        AdministrationInvoice.issue_date.desc()
    ).all()
    
    # Update status for overdue invoices
    for invoice in invoices:
        update_invoice_status(invoice)
    
    db.commit()
    
    return invoices


@router.get("/{invoice_id}", response_model=AdministrationInvoiceDetailResponse)
async def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get invoice details with payments"""
    invoice = db.query(AdministrationInvoice).filter(AdministrationInvoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    if not check_condominium_access(db, current_user, invoice.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    if not can_access_accounting(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to accounting module"
        )
    
    # Update status
    update_invoice_status(invoice)
    db.commit()
    db.refresh(invoice)
    
    return invoice


@router.put("/{invoice_id}", response_model=AdministrationInvoiceResponse)
async def update_invoice(
    invoice_id: int,
    invoice_data: AdministrationInvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an invoice"""
    invoice = db.query(AdministrationInvoice).filter(AdministrationInvoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    if not check_condominium_access(db, current_user, invoice.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    if not can_access_accounting(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to accounting module"
        )
    
    # Check if invoice is paid - if so, only allow limited updates
    if invoice.status == InvoiceStatus.PAID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update a fully paid invoice"
        )
    
    update_data = invoice_data.model_dump(exclude_unset=True)
    
    # Recalculate total and pending if amounts changed
    if 'total_amount' in update_data or 'discounts' in update_data:
        total = update_data.get('total_amount', invoice.total_amount)
        discounts = update_data.get('discounts', invoice.discounts)
        invoice.pending_amount = total - discounts - invoice.paid_amount
    
    for field, value in update_data.items():
        setattr(invoice, field, value)
    
    # Update status
    update_invoice_status(invoice)
    
    db.commit()
    db.refresh(invoice)
    
    return invoice


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete (deactivate) an invoice"""
    invoice = db.query(AdministrationInvoice).filter(AdministrationInvoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    if not check_condominium_access(db, current_user, invoice.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    if not can_access_accounting(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to accounting module"
        )
    
    # Check if invoice has payments
    if invoice.paid_amount > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete invoice with payments. Cancel it instead."
        )
    
    invoice.is_active = False
    db.commit()
    
    return None


# Invoice Payments Endpoints
@router.post("/{invoice_id}/payments", response_model=InvoicePaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    invoice_id: int,
    payment_data: InvoicePaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record a payment for an invoice"""
    invoice = db.query(AdministrationInvoice).filter(AdministrationInvoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    if not check_condominium_access(db, current_user, invoice.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    if not can_access_accounting(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to accounting module"
        )
    
    if not invoice.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add payment to inactive invoice"
        )
    
    # Check if payment exceeds pending amount
    new_paid_amount = invoice.paid_amount + payment_data.amount
    if new_paid_amount > invoice.total_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment amount exceeds pending amount. Pending: {invoice.pending_amount}"
        )
    
    payment = InvoicePayment(
        **payment_data.model_dump(),
        invoice_id=invoice_id,
        recorded_by=current_user.id
    )
    
    db.add(payment)
    
    # Update invoice paid amount
    invoice.paid_amount = new_paid_amount
    update_invoice_status(invoice)
    
    db.commit()
    db.refresh(payment)
    
    return payment


@router.get("/{invoice_id}/payments", response_model=List[InvoicePaymentResponse])
async def get_invoice_payments(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all payments for an invoice"""
    invoice = db.query(AdministrationInvoice).filter(AdministrationInvoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    if not check_condominium_access(db, current_user, invoice.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    if not can_access_accounting(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to accounting module"
        )
    
    payments = db.query(InvoicePayment).filter(
        InvoicePayment.invoice_id == invoice_id
    ).order_by(InvoicePayment.payment_date.desc()).all()
    
    return payments


@router.put("/payments/{payment_id}", response_model=InvoicePaymentResponse)
async def update_payment(
    payment_id: int,
    payment_data: InvoicePaymentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a payment"""
    payment = db.query(InvoicePayment).filter(InvoicePayment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    invoice = db.query(AdministrationInvoice).filter(AdministrationInvoice.id == payment.invoice_id).first()
    
    if not check_condominium_access(db, current_user, invoice.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    if not can_access_accounting(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to accounting module"
        )
    
    # Recalculate invoice paid amount if payment amount changed
    old_amount = payment.amount
    update_data = payment_data.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(payment, field, value)
    
    # If amount changed, update invoice
    if 'amount' in update_data:
        new_amount = update_data['amount']
        invoice.paid_amount = invoice.paid_amount - old_amount + new_amount
        
        if invoice.paid_amount > invoice.total_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Updated payment amount exceeds invoice total"
            )
        
        update_invoice_status(invoice)
    
    db.commit()
    db.refresh(payment)
    
    return payment


@router.delete("/payments/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a payment"""
    payment = db.query(InvoicePayment).filter(InvoicePayment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    invoice = db.query(AdministrationInvoice).filter(AdministrationInvoice.id == payment.invoice_id).first()
    
    if not check_condominium_access(db, current_user, invoice.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    if not can_access_accounting(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to accounting module"
        )
    
    # Update invoice paid amount
    invoice.paid_amount = invoice.paid_amount - payment.amount
    update_invoice_status(invoice)
    
    db.delete(payment)
    db.commit()
    
    return None


@router.post("/generate-monthly", response_model=List[AdministrationInvoiceResponse], status_code=status.HTTP_201_CREATED)
async def generate_monthly_invoices(
    condominium_id: int,
    month: int,
    year: int,
    base_amount: float,
    due_days: int = 15,  # Days from issue date to due date
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate monthly invoices for all active properties in a condominium"""
    if not check_condominium_access(db, current_user, condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    if not can_access_accounting(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to accounting module"
        )
    
    # Validate month
    if month < 1 or month > 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Month must be between 1 and 12"
        )
    
    # Get all active properties
    properties = db.query(Property).filter(
        Property.condominium_id == condominium_id
    ).all()
    
    if not properties:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No properties found for this condominium"
        )
    
    # Check for existing invoices
    existing_invoices = db.query(AdministrationInvoice).filter(
        AdministrationInvoice.condominium_id == condominium_id,
        AdministrationInvoice.month == month,
        AdministrationInvoice.year == year,
        AdministrationInvoice.is_active == True
    ).all()
    
    if existing_invoices:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invoices already exist for {month}/{year}. Delete them first or use individual creation."
        )
    
    # Generate invoices
    issue_date = datetime(year, month, 1)
    due_date = datetime(year, month, due_days)
    
    created_invoices = []
    for property_obj in properties:
        invoice_number = generate_invoice_number(condominium_id, month, year, property_obj.code)
        
        invoice = AdministrationInvoice(
            condominium_id=condominium_id,
            property_id=property_obj.id,
            invoice_number=invoice_number,
            month=month,
            year=year,
            issue_date=issue_date,
            due_date=due_date,
            base_amount=base_amount,
            additional_charges=0.0,
            discounts=0.0,
            total_amount=base_amount,
            paid_amount=0.0,
            pending_amount=base_amount,
            status=InvoiceStatus.PENDING,
            created_by=current_user.id
        )
        
        db.add(invoice)
        created_invoices.append(invoice)
    
    db.commit()
    
    for invoice in created_invoices:
        db.refresh(invoice)
    
    return created_invoices


@router.post("/generate-billing", response_model=GenerateBillingResponse)
async def generate_billing(
    condominium_id: int,
    body: GenerateBillingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate administration invoices for a month/year.
    Method: global (all units), block (units in selected block), unit (selected units).
    Skips units that already have an invoice for that month/year.
    """
    if not check_condominium_access(db, current_user, condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium",
        )
    if not can_access_accounting(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to accounting module",
        )
    if body.month < 1 or body.month > 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Month must be between 1 and 12",
        )
    if body.method not in ("global", "block", "unit"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="method must be 'global', 'block', or 'unit'",
        )
    if body.method == "block" and not body.block_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="block_id is required when method is 'block'",
        )
    if body.method == "unit":
        if not body.property_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="property_ids is required when method is 'unit'",
            )
        props = (
            db.query(Property)
            .filter(
                Property.condominium_id == condominium_id,
                Property.id.in_(body.property_ids),
            )
            .all()
        )
        if len(props) != len(body.property_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Some property_ids do not belong to this condominium",
            )
        target_properties = props
    elif body.method == "block":
        block = (
            db.query(Block)
            .filter(
                Block.id == body.block_id,
                Block.condominium_id == condominium_id,
            )
            .first()
        )
        if not block:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Block not found in this condominium",
            )
        target_properties = (
            db.query(Property)
            .filter(Property.condominium_id == condominium_id, Property.block_id == body.block_id)
            .all()
        )
    else:
        target_properties = (
            db.query(Property).filter(Property.condominium_id == condominium_id).all()
        )

    if not target_properties:
        return GenerateBillingResponse(
            created=[],
            skipped_property_ids=[],
            message="No hay unidades para facturar con los criterios seleccionados.",
        )

    existing = (
        db.query(AdministrationInvoice)
        .filter(
            AdministrationInvoice.condominium_id == condominium_id,
            AdministrationInvoice.month == body.month,
            AdministrationInvoice.year == body.year,
            AdministrationInvoice.is_active == True,
        )
        .all()
    )
    already_invoiced = {inv.property_id for inv in existing}

    to_create = [p for p in target_properties if p.id not in already_invoiced]
    skipped_ids = [p.id for p in target_properties if p.id in already_invoiced]

    issue_date = datetime(body.year, body.month, 1)
    due_date = datetime(body.year, body.month, 1) + timedelta(days=body.due_days)
    base = max(0.0, float(body.base_amount))

    created_invoices = []
    for prop in to_create:
        inv_num = generate_invoice_number(condominium_id, body.month, body.year, prop.code)
        inv = AdministrationInvoice(
            condominium_id=condominium_id,
            property_id=prop.id,
            invoice_number=inv_num,
            month=body.month,
            year=body.year,
            issue_date=issue_date,
            due_date=due_date,
            base_amount=base,
            additional_charges=0.0,
            discounts=0.0,
            total_amount=base,
            paid_amount=0.0,
            pending_amount=base,
            status=InvoiceStatus.PENDING,
            created_by=current_user.id,
        )
        db.add(inv)
        created_invoices.append(inv)

    db.commit()
    for inv in created_invoices:
        db.refresh(inv)

    msg = f"Se generaron {len(created_invoices)} factura(s)."
    if skipped_ids:
        msg += f" {len(skipped_ids)} unidad(es) ya tenían factura para {body.month}/{body.year}."

    return GenerateBillingResponse(
        created=created_invoices,
        skipped_property_ids=skipped_ids,
        message=msg,
    )
