from typing import List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.models.condominium import Condominium


class Role:
    ADMIN = "admin"
    ACCOUNTANT = "accountant"
    ACCOUNTING_ASSISTANT = "accounting_assistant"
    USER = "user"


def require_roles(allowed_roles: List[str]):
    """Decorator to require specific roles"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            user_roles = [ur.role.name for ur in current_user.user_roles]
            if not any(role in user_roles for role in allowed_roles):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permissions"
                )
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def check_condominium_access(db: Session, user: User, condominium_id: int) -> bool:
    """Check if user has access to a condominium"""
    user_condominiums = [uc.condominium_id for uc in user.user_condominiums]
    return condominium_id in user_condominiums


def require_condominium_access(func):
    """Decorator to require condominium access"""
    async def wrapper(*args, **kwargs):
        db = kwargs.get('db')
        current_user = kwargs.get('current_user')
        condominium_id = kwargs.get('condominium_id')
        
        if not check_condominium_access(db, current_user, condominium_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this condominium"
            )
        return await func(*args, **kwargs)
    return wrapper


def can_access_accounting(user: User) -> bool:
    """Check if user can access accounting module"""
    user_roles = [ur.role.name for ur in user.user_roles]
    return any(role in user_roles for role in [
        Role.ADMIN, Role.ACCOUNTANT, Role.ACCOUNTING_ASSISTANT
    ])


def can_manage_bank_reconciliation(user: User) -> bool:
    """Check if user can manage bank reconciliation"""
    user_roles = [ur.role.name for ur in user.user_roles]
    return any(role in user_roles for role in [Role.ADMIN, Role.ACCOUNTANT])


def can_manage_budgets(user: User) -> bool:
    """Check if user can manage budgets"""
    user_roles = [ur.role.name for ur in user.user_roles]
    return any(role in user_roles for role in [Role.ADMIN, Role.ACCOUNTANT])

