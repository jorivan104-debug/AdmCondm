from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import json
import shutil
from pathlib import Path
from datetime import datetime
from app.core.database import get_db
from app.core.permissions import check_condominium_access, Role, is_super_admin
from app.core.config import settings
from app.models.property import Property, PropertyResident
from app.models.condominium import Condominium
from app.models.resident import Resident
from app.models.user import User
from app.models.block import Block
from app.api.auth import get_current_user
from app.schemas.property import PropertyCreate, PropertyUpdate, PropertyResponse, PropertyResidentCreate, PropertyResidentResponse, PropertyResidentAssignment

router = APIRouter()

# Ensure upload directory exists
UPLOAD_DIR = Path(settings.UPLOAD_DIR)
UPLOAD_DIR.mkdir(exist_ok=True)
PROPERTY_UPLOAD_DIR = UPLOAD_DIR / "properties"
PROPERTY_UPLOAD_DIR.mkdir(exist_ok=True)


def save_property_photo(file: UploadFile, property_id: int) -> str:
    """Save uploaded property photo and return URL"""
    file_ext = Path(file.filename).suffix
    filename = f"photo_{property_id}{file_ext}"
    file_path = PROPERTY_UPLOAD_DIR / filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return f"/uploads/properties/{filename}"


@router.post("/", response_model=PropertyResponse, status_code=status.HTTP_201_CREATED)
async def create_property(
    property_data: PropertyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new property"""
    # Check condominium access
    if not check_condominium_access(db, current_user, property_data.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    # Check if user has admin or super_admin role
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if not is_super_admin(current_user) and Role.ADMIN not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create properties"
        )
    
    # Verify condominium exists
    condominium = db.query(Condominium).filter(Condominium.id == property_data.condominium_id).first()
    if not condominium:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Condominium not found"
        )
    
    property = Property(**property_data.model_dump())
    db.add(property)
    db.commit()
    db.refresh(property)
    
    return property


@router.post("/create-complete", response_model=PropertyResponse, status_code=status.HTTP_201_CREATED)
async def create_property_complete(
    condominium_id: int = Form(...),
    code: str = Form(...),
    type: str = Form(...),
    block_id: Optional[str] = Form(None),
    area: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    residents_json: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new property with photo and residents in one operation"""
    # Check condominium access
    if not check_condominium_access(db, current_user, condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    # Check if user has admin or super_admin role
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if not is_super_admin(current_user) and Role.ADMIN not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create properties"
        )
    
    # Verify condominium exists
    condominium = db.query(Condominium).filter(Condominium.id == condominium_id).first()
    if not condominium:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Condominium not found"
        )
    
    # Convert area to float if provided
    area_float = None
    if area:
        try:
            area_float = float(area)
        except (ValueError, TypeError):
            area_float = None
    
    # Convert block_id to int if provided
    block_id_int = None
    if block_id:
        try:
            block_id_int = int(block_id)
            # Verify block exists and belongs to condominium
            block = db.query(Block).filter(Block.id == block_id_int).first()
            if not block or block.condominium_id != condominium_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Block not found or does not belong to this condominium"
                )
        except (ValueError, TypeError):
            block_id_int = None
    
    # Create property
    property = Property(
        condominium_id=condominium_id,
        code=code,
        type=type,
        block_id=block_id_int,
        area=area_float,
        description=description
    )
    db.add(property)
    db.commit()
    db.refresh(property)
    
    # Upload photo if provided
    if photo:
        photo_url = save_property_photo(photo, property.id)
        property.photo_url = photo_url
        db.commit()
        db.refresh(property)
    
    # Assign residents if provided
    if residents_json:
        try:
            residents_data = json.loads(residents_json)
            current_date = datetime.utcnow()
            
            for resident_assignment in residents_data:
                resident_id = resident_assignment.get("resident_id")
                is_owner = resident_assignment.get("is_owner", False)
                ownership_percentage = resident_assignment.get("ownership_percentage", 100.0 if is_owner else 0.0)
                
                # Verify resident exists and belongs to same condominium
                resident = db.query(Resident).filter(Resident.id == resident_id).first()
                if not resident or resident.condominium_id != condominium_id:
                    continue  # Skip invalid residents
                
                # If this is the owner, set ownership to 100% or adjust percentages
                if is_owner:
                    ownership_percentage = 100.0
                
                property_resident = PropertyResident(
                    property_id=property.id,
                    resident_id=resident_id,
                    start_date=current_date,
                    end_date=None,
                    ownership_percentage=ownership_percentage
                )
                db.add(property_resident)
            
            db.commit()
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            # Log error but don't fail the property creation
            pass
    
    return property


@router.get("/condominium/{condominium_id}", response_model=List[PropertyResponse])
async def get_properties_by_condominium(
    condominium_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all properties for a condominium"""
    if not check_condominium_access(db, current_user, condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    from sqlalchemy.orm import joinedload
    from app.models.resident import Resident
    
    properties = db.query(Property).options(
        joinedload(Property.block),
        joinedload(Property.property_residents).joinedload(PropertyResident.resident)
    ).filter(Property.condominium_id == condominium_id).all()
    return properties


@router.get("/{property_id}", response_model=PropertyResponse)
async def get_property(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific property"""
    property = db.query(Property).options(
        joinedload(Property.block),
        joinedload(Property.property_residents).joinedload(PropertyResident.resident)
    ).filter(Property.id == property_id).first()
    if not property:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    
    if not check_condominium_access(db, current_user, property.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this property"
        )
    
    return property


@router.put("/{property_id}", response_model=PropertyResponse)
async def update_property(
    property_id: int,
    property_data: PropertyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a property"""
    property = db.query(Property).filter(Property.id == property_id).first()
    if not property:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    
    if not check_condominium_access(db, current_user, property.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this property"
        )
    
    # Check if user has admin or super_admin role
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if not is_super_admin(current_user) and Role.ADMIN not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update properties"
        )
    
    update_data = property_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(property, field, value)
    
    db.commit()
    db.refresh(property)
    
    return property


@router.put("/update-complete/{property_id}", response_model=PropertyResponse)
async def update_property_complete(
    property_id: int,
    code: Optional[str] = Form(None),
    type: Optional[str] = Form(None),
    block_id: Optional[str] = Form(None),
    area: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    residents_json: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a property with photo in one operation"""
    property = db.query(Property).filter(Property.id == property_id).first()
    if not property:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    
    if not check_condominium_access(db, current_user, property.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this property"
        )
    
    # Check if user has admin or super_admin role
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if not is_super_admin(current_user) and Role.ADMIN not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update properties"
        )
    
    # Update basic fields
    if code is not None:
        property.code = code
    if type is not None:
        property.type = type
    if description is not None:
        property.description = description
    
    # Convert area to float if provided
    if area is not None:
        try:
            property.area = float(area) if area else None
        except (ValueError, TypeError):
            pass
    
    # Convert block_id to int if provided
    if block_id is not None:
        if block_id:
            try:
                block_id_int = int(block_id)
                # Verify block exists and belongs to condominium
                block = db.query(Block).filter(Block.id == block_id_int).first()
                if not block or block.condominium_id != property.condominium_id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Block not found or does not belong to this condominium"
                    )
                property.block_id = block_id_int
            except (ValueError, TypeError):
                pass
        else:
            property.block_id = None
    
    # Upload photo if provided
    if photo:
        photo_url = save_property_photo(photo, property.id)
        property.photo_url = photo_url
    
    # Update residents if provided
    if residents_json is not None:  # Use is not None to allow empty string
        # Delete existing property-resident relationships
        db.query(PropertyResident).filter(PropertyResident.property_id == property.id).delete()
        
        # Add new resident assignments if provided
        if residents_json:
            try:
                residents_data = json.loads(residents_json)
                current_date = datetime.utcnow()
                
                for resident_assignment in residents_data:
                    resident_id = resident_assignment.get("resident_id")
                    is_owner = resident_assignment.get("is_owner", False)
                    ownership_percentage = resident_assignment.get("ownership_percentage", 100.0 if is_owner else 0.0)
                    
                    # Verify resident exists and belongs to same condominium
                    resident = db.query(Resident).filter(Resident.id == resident_id).first()
                    if not resident or resident.condominium_id != property.condominium_id:
                        continue  # Skip invalid residents
                    
                    # If this is the owner, set ownership to 100% or adjust percentages
                    if is_owner:
                        ownership_percentage = 100.0
                    
                    property_resident = PropertyResident(
                        property_id=property.id,
                        resident_id=resident_id,
                        start_date=current_date,
                        end_date=None,
                        ownership_percentage=ownership_percentage
                    )
                    db.add(property_resident)
            except (json.JSONDecodeError, KeyError, ValueError) as e:
                # Log error but don't fail the property update
                pass
    
    db.commit()
    db.refresh(property)
    
    return property


@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_property(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a property"""
    property = db.query(Property).filter(Property.id == property_id).first()
    if not property:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    
    if not check_condominium_access(db, current_user, property.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this property"
        )
    
    # Check if user has admin or super_admin role
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if not is_super_admin(current_user) and Role.ADMIN not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete properties"
        )
    
    db.delete(property)
    db.commit()
    
    return None
