from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.core.permissions import check_condominium_access, Role
from app.models.assembly import Assembly, AssemblyVote, VoteRecord, AssemblyAttendance
from app.models.condominium import Condominium
from app.models.resident import Resident
from app.models.property import Property, PropertyResident
from app.models.user import User
from app.api.auth import get_current_user
from app.schemas.assembly import (
    AssemblyCreate,
    AssemblyUpdate,
    AssemblyResponse,
    AssemblyDetailResponse,
    AssemblyVoteCreate,
    AssemblyVoteUpdate,
    AssemblyVoteResponse,
    VoteRecordCreate,
    VoteRecordResponse,
    AssemblyAttendanceCreate,
    AssemblyAttendanceResponse
)

router = APIRouter()


@router.post("/", response_model=AssemblyResponse, status_code=status.HTTP_201_CREATED)
async def create_assembly(
    assembly_data: AssemblyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new assembly"""
    if not check_condominium_access(db, current_user, assembly_data.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    # Check if user has admin or super_admin role
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if Role.ADMIN not in user_roles and Role.SUPER_ADMIN not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create assemblies"
        )
    
    # Get the next assembly number for this condominium
    last_assembly = db.query(Assembly).filter(
        Assembly.condominium_id == assembly_data.condominium_id,
        Assembly.assembly_number.isnot(None)
    ).order_by(Assembly.assembly_number.desc()).first()
    
    next_number = 1
    if last_assembly and last_assembly.assembly_number:
        next_number = last_assembly.assembly_number + 1
    
    assembly = Assembly(
        **assembly_data.model_dump(),
        created_by=current_user.id,
        assembly_number=next_number
    )
    db.add(assembly)
    db.commit()
    db.refresh(assembly)
    
    return assembly


@router.get("/condominium/{condominium_id}", response_model=List[AssemblyResponse])
async def get_assemblies(
    condominium_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all assemblies for a condominium"""
    if not check_condominium_access(db, current_user, condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    assemblies = db.query(Assembly).filter(
        Assembly.condominium_id == condominium_id,
        Assembly.is_active == True
    ).order_by(Assembly.scheduled_date.desc()).all()
    
    return assemblies


@router.get("/{assembly_id}", response_model=AssemblyDetailResponse)
async def get_assembly(
    assembly_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get assembly details with votes and attendees"""
    assembly = db.query(Assembly).filter(Assembly.id == assembly_id).first()
    if not assembly:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assembly not found"
        )
    
    if not check_condominium_access(db, current_user, assembly.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    # Calculate current quorum
    total_units = db.query(func.count(Property.id)).filter(
        Property.condominium_id == assembly.condominium_id
    ).scalar() or 0
    
    if total_units > 0:
        # Count unique property owners (residents with property ownership)
        owners_count = db.query(func.count(func.distinct(PropertyResident.resident_id))).filter(
            PropertyResident.property_id.in_(
                db.query(Property.id).filter(Property.condominium_id == assembly.condominium_id)
            )
        ).scalar() or 0
        
        # Count attendees
        attendees_count = db.query(func.count(AssemblyAttendance.id)).filter(
            AssemblyAttendance.assembly_id == assembly_id,
            AssemblyAttendance.attended == True
        ).scalar() or 0
        
        # Calculate quorum percentage (using attendees or owners)
        assembly.current_quorum = (attendees_count / total_units * 100) if total_units > 0 else 0
    else:
        assembly.current_quorum = 0
    
    db.commit()
    db.refresh(assembly)
    
    return assembly


@router.put("/{assembly_id}", response_model=AssemblyResponse)
async def update_assembly(
    assembly_id: int,
    assembly_data: AssemblyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an assembly"""
    assembly = db.query(Assembly).filter(Assembly.id == assembly_id).first()
    if not assembly:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assembly not found"
        )
    
    if not check_condominium_access(db, current_user, assembly.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    # Check if user has admin or super_admin role
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if Role.ADMIN not in user_roles and Role.SUPER_ADMIN not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update assemblies"
        )
    
    update_data = assembly_data.model_dump(exclude_unset=True)
    
    # If status is changing to 'in_progress' and started_at is not set, set it
    if update_data.get('status') == 'in_progress' and not assembly.started_at:
        assembly.started_at = datetime.utcnow()
    
    for field, value in update_data.items():
        setattr(assembly, field, value)
    
    db.commit()
    db.refresh(assembly)
    
    return assembly


@router.delete("/{assembly_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assembly(
    assembly_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete (deactivate) an assembly - Only super administrators can delete"""
    assembly = db.query(Assembly).filter(Assembly.id == assembly_id).first()
    if not assembly:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assembly not found"
        )
    
    if not check_condominium_access(db, current_user, assembly.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    # Check if user has super_admin role - only super admins can delete
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if Role.SUPER_ADMIN not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super administrators can delete assemblies"
        )
    
    assembly.is_active = False
    db.commit()
    
    return None


# Assembly Votes Endpoints
@router.post("/{assembly_id}/votes", response_model=AssemblyVoteResponse, status_code=status.HTTP_201_CREATED)
async def create_assembly_vote(
    assembly_id: int,
    vote_data: AssemblyVoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a vote for an assembly"""
    assembly = db.query(Assembly).filter(Assembly.id == assembly_id).first()
    if not assembly:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assembly not found"
        )
    
    # Check if assembly is completed - if so, no new votes allowed
    if assembly.status == 'completed':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create votes in a completed assembly"
        )
    
    if not check_condominium_access(db, current_user, assembly.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    # Check if user has admin or super_admin role
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if Role.ADMIN not in user_roles and Role.SUPER_ADMIN not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create votes"
        )
    
    # Initialize option_votes as empty JSON if options are provided
    vote_dict = vote_data.model_dump()
    vote_dict['assembly_id'] = assembly_id
    
    # Initialize option_votes if options exist
    if vote_dict.get('options'):
        import json
        try:
            options = json.loads(vote_dict['options'])
            option_votes = {}
            for opt in options:
                if 'key' in opt:
                    option_votes[opt['key']] = 0
            vote_dict['option_votes'] = json.dumps(option_votes)
        except:
            vote_dict['option_votes'] = '{}'
    else:
        vote_dict['option_votes'] = None
    
    vote = AssemblyVote(**vote_dict)
    db.add(vote)
    db.commit()
    db.refresh(vote)
    
    return vote


@router.get("/{assembly_id}/votes", response_model=List[AssemblyVoteResponse])
async def get_assembly_votes(
    assembly_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all votes for an assembly"""
    assembly = db.query(Assembly).filter(Assembly.id == assembly_id).first()
    if not assembly:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assembly not found"
        )
    
    if not check_condominium_access(db, current_user, assembly.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    votes = db.query(AssemblyVote).filter(
        AssemblyVote.assembly_id == assembly_id,
        AssemblyVote.is_active == True
    ).all()
    
    return votes


@router.put("/votes/{vote_id}", response_model=AssemblyVoteResponse)
async def update_assembly_vote(
    vote_id: int,
    vote_data: AssemblyVoteUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an assembly vote"""
    vote = db.query(AssemblyVote).filter(AssemblyVote.id == vote_id).first()
    if not vote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vote not found"
        )
    
    assembly = db.query(Assembly).filter(Assembly.id == vote.assembly_id).first()
    if not assembly:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assembly not found"
        )
    
    # Check if assembly is completed - if so, no edits allowed
    if assembly.status == 'completed':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot edit votes in a completed assembly"
        )
    
    if not check_condominium_access(db, current_user, assembly.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    # Check if user has admin or super_admin role
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if Role.ADMIN not in user_roles and Role.SUPER_ADMIN not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update votes"
        )
    
    update_data = vote_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(vote, field, value)
    
    db.commit()
    db.refresh(vote)
    
    return vote


@router.post("/votes/{vote_id}/record", response_model=VoteRecordResponse, status_code=status.HTTP_201_CREATED)
async def record_vote(
    vote_id: int,
    vote_record: VoteRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record a vote from a resident"""
    vote = db.query(AssemblyVote).filter(AssemblyVote.id == vote_id).first()
    if not vote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vote not found"
        )
    
    if not vote.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This vote is not active"
        )
    
    assembly = db.query(Assembly).filter(Assembly.id == vote.assembly_id).first()
    if not check_condominium_access(db, current_user, assembly.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    # Check if resident already voted
    existing_vote = db.query(VoteRecord).filter(
        VoteRecord.vote_id == vote_id,
        VoteRecord.resident_id == vote_record.resident_id
    ).first()
    
    if existing_vote:
        # Update existing vote
        existing_vote.vote_value = vote_record.vote_value
        db.commit()
        db.refresh(existing_vote)
        
        # Update vote counts
        _update_vote_counts(db, vote_id)
        
        return existing_vote
    
    # Create new vote record
    record = VoteRecord(**vote_record.model_dump(), vote_id=vote_id)
    db.add(record)
    db.commit()
    db.refresh(record)
    
    # Update vote counts
    _update_vote_counts(db, vote_id)
    
    return record


def _update_vote_counts(db: Session, vote_id: int):
    """Helper function to update vote counts"""
    import json
    vote = db.query(AssemblyVote).filter(AssemblyVote.id == vote_id).first()
    if not vote:
        return
    
    records = db.query(VoteRecord).filter(VoteRecord.vote_id == vote_id).all()
    
    vote.total_votes = len(records)
    
    # Si tiene opciones personalizadas, contar por opción
    if vote.options:
        try:
            options = json.loads(vote.options)
            option_votes = {}
            for opt in options:
                option_votes[opt.get('key', '')] = 0
            
            for record in records:
                vote_key = record.vote_value
                if vote_key in option_votes:
                    option_votes[vote_key] = option_votes.get(vote_key, 0) + 1
            
            vote.option_votes = json.dumps(option_votes)
        except:
            pass
    
    # Mantener compatibilidad con yes/no/abstain
    vote.yes_votes = len([r for r in records if r.vote_value.lower() == 'yes' or r.vote_value.lower() == 'sí'])
    vote.no_votes = len([r for r in records if r.vote_value.lower() == 'no'])
    vote.abstain_votes = len([r for r in records if r.vote_value.lower() == 'abstain' or r.vote_value.lower() == 'abstención'])
    
    db.commit()


@router.post("/{assembly_id}/attendance", response_model=AssemblyAttendanceResponse, status_code=status.HTTP_201_CREATED)
async def record_attendance(
    assembly_id: int,
    attendance_data: AssemblyAttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record attendance for an assembly"""
    assembly = db.query(Assembly).filter(Assembly.id == assembly_id).first()
    if not assembly:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assembly not found"
        )
    
    if not check_condominium_access(db, current_user, assembly.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    # Check if attendance already exists
    existing = db.query(AssemblyAttendance).filter(
        AssemblyAttendance.assembly_id == assembly_id,
        AssemblyAttendance.resident_id == attendance_data.resident_id
    ).first()
    
    if existing:
        existing.attended = attendance_data.attended
        if attendance_data.attended:
            existing.attendance_confirmed_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing
    
    attendance = AssemblyAttendance(**attendance_data.model_dump(), assembly_id=assembly_id)
    if attendance.attended:
        attendance.attendance_confirmed_at = datetime.utcnow()
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    
    return attendance


@router.get("/{assembly_id}/attendance", response_model=List[AssemblyAttendanceResponse])
async def get_assembly_attendance(
    assembly_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get attendance list for an assembly"""
    assembly = db.query(Assembly).filter(Assembly.id == assembly_id).first()
    if not assembly:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assembly not found"
        )
    
    if not check_condominium_access(db, current_user, assembly.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    attendance_list = db.query(AssemblyAttendance).filter(
        AssemblyAttendance.assembly_id == assembly_id
    ).all()
    
    return attendance_list


@router.put("/{assembly_id}/minutes", response_model=AssemblyResponse)
async def update_assembly_minutes(
    assembly_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update assembly minutes (acta) - Only admins can update, and only if assembly is not completed"""
    assembly = db.query(Assembly).filter(Assembly.id == assembly_id).first()
    if not assembly:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assembly not found"
        )
    
    # Check if assembly is completed - if so, no edits allowed
    if assembly.status == 'completed':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot edit minutes in a completed assembly"
        )
    
    if not check_condominium_access(db, current_user, assembly.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    # Check if user has admin or super_admin role
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if Role.ADMIN not in user_roles and Role.SUPER_ADMIN not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update assembly minutes"
        )
    
    # Read body as text
    minutes = await request.body()
    assembly.minutes = minutes.decode('utf-8')
    db.commit()
    db.refresh(assembly)
    
    return assembly
