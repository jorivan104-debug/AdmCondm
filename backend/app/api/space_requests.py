from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.permissions import check_condominium_access, Role
from app.models.space_request import SpaceRequest, RequestStatus
from app.models.resident import Resident
from app.models.user import User
from app.api.auth import get_current_user
from app.schemas.space_request import SpaceRequestCreate, SpaceRequestUpdate, SpaceRequestResponse
from datetime import datetime

router = APIRouter()


@router.post("/", response_model=SpaceRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_space_request(
    request_data: SpaceRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new space request"""
    if not check_condominium_access(db, current_user, request_data.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    # Verify resident exists and belongs to condominium
    resident = db.query(Resident).filter(Resident.id == request_data.resident_id).first()
    if not resident or resident.condominium_id != request_data.condominium_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resident not found or belongs to different condominium"
        )
    
    # Users can only create requests for themselves (unless admin)
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if Role.ADMIN not in user_roles and resident.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create requests for yourself"
        )
    
    space_request = SpaceRequest(**request_data.model_dump())
    db.add(space_request)
    db.commit()
    db.refresh(space_request)
    
    return space_request


@router.get("/condominium/{condominium_id}", response_model=List[SpaceRequestResponse])
async def get_space_requests(
    condominium_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all space requests for a condominium"""
    if not check_condominium_access(db, current_user, condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    # Users can only see their own requests (unless admin)
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if Role.ADMIN in user_roles:
        requests = db.query(SpaceRequest).filter(
            SpaceRequest.condominium_id == condominium_id
        ).all()
    else:
        # Get resident IDs for current user
        residents = db.query(Resident).filter(Resident.user_id == current_user.id).all()
        resident_ids = [r.id for r in residents]
        requests = db.query(SpaceRequest).filter(
            SpaceRequest.condominium_id == condominium_id,
            SpaceRequest.resident_id.in_(resident_ids)
        ).all()
    
    return requests


@router.get("/{request_id}", response_model=SpaceRequestResponse)
async def get_space_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific space request"""
    space_request = db.query(SpaceRequest).filter(SpaceRequest.id == request_id).first()
    if not space_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Space request not found"
        )
    
    if not check_condominium_access(db, current_user, space_request.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Users can only see their own requests (unless admin)
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if Role.ADMIN not in user_roles:
        resident = db.query(Resident).filter(Resident.id == space_request.resident_id).first()
        if not resident or resident.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this request"
            )
    
    return space_request


@router.put("/{request_id}/approve", response_model=SpaceRequestResponse)
async def approve_space_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve a space request (admin only)"""
    space_request = db.query(SpaceRequest).filter(SpaceRequest.id == request_id).first()
    if not space_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Space request not found"
        )
    
    if not check_condominium_access(db, current_user, space_request.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Only admin can approve
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if Role.ADMIN not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can approve requests"
        )
    
    space_request.status = RequestStatus.APPROVED
    space_request.approved_by = current_user.id
    space_request.approved_at = datetime.utcnow()
    
    db.commit()
    db.refresh(space_request)
    
    return space_request


@router.put("/{request_id}/reject", response_model=SpaceRequestResponse)
async def reject_space_request(
    request_id: int,
    rejection_reason: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reject a space request (admin only)"""
    space_request = db.query(SpaceRequest).filter(SpaceRequest.id == request_id).first()
    if not space_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Space request not found"
        )
    
    if not check_condominium_access(db, current_user, space_request.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Only admin can reject
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if Role.ADMIN not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can reject requests"
        )
    
    space_request.status = RequestStatus.REJECTED
    space_request.approved_by = current_user.id
    space_request.approved_at = datetime.utcnow()
    space_request.rejection_reason = rejection_reason
    
    db.commit()
    db.refresh(space_request)
    
    return space_request


@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_space_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a space request"""
    space_request = db.query(SpaceRequest).filter(SpaceRequest.id == request_id).first()
    if not space_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Space request not found"
        )
    
    if not check_condominium_access(db, current_user, space_request.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Users can only delete their own pending requests (unless admin)
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if Role.ADMIN not in user_roles:
        resident = db.query(Resident).filter(Resident.id == space_request.resident_id).first()
        if not resident or resident.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own requests"
            )
        if space_request.status != RequestStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only delete pending requests"
            )
    
    db.delete(space_request)
    db.commit()
    
    return None

