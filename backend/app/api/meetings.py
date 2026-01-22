from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.permissions import check_condominium_access, Role
from app.models.meeting import Meeting, MeetingAttendance
from app.models.condominium import Condominium
from app.models.user import User
from app.api.auth import get_current_user
from app.schemas.meeting import (
    MeetingCreate,
    MeetingUpdate,
    MeetingResponse,
    MeetingAttendanceCreate,
    MeetingAttendanceResponse
)

router = APIRouter()


@router.post("/", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
async def create_meeting(
    meeting_data: MeetingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new meeting"""
    if not check_condominium_access(db, current_user, meeting_data.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    # Check if user has admin role
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if Role.ADMIN not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create meetings"
        )
    
    meeting = Meeting(**meeting_data.model_dump(), created_by=current_user.id)
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    
    return meeting


@router.get("/condominium/{condominium_id}", response_model=List[MeetingResponse])
async def get_meetings(
    condominium_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all meetings for a condominium"""
    if not check_condominium_access(db, current_user, condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    meetings = db.query(Meeting).filter(Meeting.condominium_id == condominium_id).all()
    return meetings


@router.get("/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific meeting"""
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )
    
    if not check_condominium_access(db, current_user, meeting.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return meeting


@router.put("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(
    meeting_id: int,
    meeting_data: MeetingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a meeting"""
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )
    
    if not check_condominium_access(db, current_user, meeting.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Check if user has admin role or is the creator
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if Role.ADMIN not in user_roles and meeting.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators or meeting creator can update meetings"
        )
    
    update_data = meeting_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(meeting, field, value)
    
    db.commit()
    db.refresh(meeting)
    
    return meeting


@router.post("/{meeting_id}/attendances", response_model=MeetingAttendanceResponse, status_code=status.HTTP_201_CREATED)
async def create_attendance(
    meeting_id: int,
    attendance_data: MeetingAttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create or update meeting attendance"""
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )
    
    if not check_condominium_access(db, current_user, meeting.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Check if attendance already exists
    existing = db.query(MeetingAttendance).filter(
        MeetingAttendance.meeting_id == meeting_id,
        MeetingAttendance.resident_id == attendance_data.resident_id
    ).first()
    
    if existing:
        # Update existing
        existing.attended = attendance_data.attended
        existing.vote = attendance_data.vote
        existing.notes = attendance_data.notes
        db.commit()
        db.refresh(existing)
        return existing
    else:
        # Create new
        attendance = MeetingAttendance(
            meeting_id=meeting_id,
            **attendance_data.model_dump(exclude={"meeting_id"})
        )
        db.add(attendance)
        db.commit()
        db.refresh(attendance)
        return attendance


@router.get("/{meeting_id}/attendances", response_model=List[MeetingAttendanceResponse])
async def get_attendances(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all attendances for a meeting"""
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )
    
    if not check_condominium_access(db, current_user, meeting.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    attendances = db.query(MeetingAttendance).filter(
        MeetingAttendance.meeting_id == meeting_id
    ).all()
    
    return attendances

