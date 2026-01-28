import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.permissions import (
    check_condominium_access,
    can_access_accounting,
    can_manage_bank_reconciliation,
    can_manage_budgets,
    Role
)
from app.models.accounting import AccountingTransaction, Budget, BankReconciliation, TransactionType, TransactionStatus
from app.models.condominium import Condominium
from app.models.user import User
from app.api.auth import get_current_user
from app.schemas.accounting import (
    AccountingTransactionCreate,
    AccountingTransactionUpdate,
    AccountingTransactionResponse,
    BudgetCreate,
    BudgetUpdate,
    BudgetResponse,
    BankReconciliationCreate,
    BankReconciliationResponse
)

logger = logging.getLogger(__name__)
router = APIRouter()


# Transactions
@router.post("/transactions", response_model=AccountingTransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    transaction_data: AccountingTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new accounting transaction"""
    if not check_condominium_access(db, current_user, transaction_data.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    if not can_access_accounting(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to accounting module"
        )
    
    transaction = AccountingTransaction(
        **transaction_data.model_dump(),
        created_by=current_user.id,
        status=TransactionStatus.PENDING
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    
    return transaction


@router.get("/transactions/condominium/{condominium_id}", response_model=List[AccountingTransactionResponse])
async def get_transactions(
    condominium_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all transactions for a condominium"""
    try:
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

        transactions = db.query(AccountingTransaction).filter(
            AccountingTransaction.condominium_id == condominium_id
        ).all()

        return [AccountingTransactionResponse.model_validate(t) for t in transactions]
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("get_transactions failed: condominium_id=%s", condominium_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al cargar las transacciones",
        ) from e


@router.put("/transactions/{transaction_id}", response_model=AccountingTransactionResponse)
async def update_transaction(
    transaction_id: int,
    transaction_data: AccountingTransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an accounting transaction"""
    transaction = db.query(AccountingTransaction).filter(
        AccountingTransaction.id == transaction_id
    ).first()
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    if not check_condominium_access(db, current_user, transaction.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    if not can_access_accounting(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to accounting module"
        )
    
    update_data = transaction_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(transaction, field, value)
    
    db.commit()
    db.refresh(transaction)
    
    return transaction


@router.delete("/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an accounting transaction"""
    transaction = db.query(AccountingTransaction).filter(
        AccountingTransaction.id == transaction_id
    ).first()
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    if not check_condominium_access(db, current_user, transaction.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Only admin and accountant can delete
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if Role.ADMIN not in user_roles and Role.ACCOUNTANT not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators and accountants can delete transactions"
        )
    
    db.delete(transaction)
    db.commit()
    
    return None


# Budgets
@router.post("/budgets", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
async def create_budget(
    budget_data: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new budget"""
    if not check_condominium_access(db, current_user, budget_data.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    if not can_manage_budgets(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to budget management"
        )
    
    budget = Budget(**budget_data.model_dump())
    db.add(budget)
    db.commit()
    db.refresh(budget)
    
    return budget


@router.get("/budgets/condominium/{condominium_id}", response_model=List[BudgetResponse])
async def get_budgets(
    condominium_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all budgets for a condominium"""
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
    
    budgets = db.query(Budget).filter(Budget.condominium_id == condominium_id).all()
    return budgets


@router.put("/budgets/{budget_id}", response_model=BudgetResponse)
async def update_budget(
    budget_id: int,
    budget_data: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a budget"""
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )
    
    if not check_condominium_access(db, current_user, budget.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Check if budget is approved and user is not admin/accountant
    if budget.is_approved and not can_manage_budgets(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot modify approved budget"
        )
    
    update_data = budget_data.model_dump(exclude_unset=True)
    
    # Handle approval
    if "is_approved" in update_data and update_data["is_approved"]:
        if not can_manage_budgets(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators and accountants can approve budgets"
            )
        from datetime import datetime
        budget.approved_by = current_user.id
        budget.approved_at = datetime.utcnow()
    
    for field, value in update_data.items():
        if field != "is_approved":
            setattr(budget, field, value)
    
    db.commit()
    db.refresh(budget)
    
    return budget


# Bank Reconciliations
@router.post("/bank-reconciliations", response_model=BankReconciliationResponse, status_code=status.HTTP_201_CREATED)
async def create_bank_reconciliation(
    reconciliation_data: BankReconciliationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new bank reconciliation"""
    if not check_condominium_access(db, current_user, reconciliation_data.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    if not can_manage_bank_reconciliation(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to bank reconciliation"
        )
    
    reconciliation = BankReconciliation(
        **reconciliation_data.model_dump(),
        reconciled_by=current_user.id
    )
    db.add(reconciliation)
    db.commit()
    db.refresh(reconciliation)
    
    return reconciliation


@router.get("/bank-reconciliations/condominium/{condominium_id}", response_model=List[BankReconciliationResponse])
async def get_bank_reconciliations(
    condominium_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all bank reconciliations for a condominium"""
    if not check_condominium_access(db, current_user, condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    if not can_manage_bank_reconciliation(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to bank reconciliation"
        )
    
    reconciliations = db.query(BankReconciliation).filter(
        BankReconciliation.condominium_id == condominium_id
    ).all()
    
    return reconciliations

