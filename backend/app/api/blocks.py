from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.permissions import check_condominium_access, Role
from app.models.block import Block
from app.models.condominium import Condominium
from app.models.user import User
from app.api.auth import get_current_user
from app.schemas.block import BlockCreate, BlockUpdate, BlockResponse

router = APIRouter()


@router.post("/", response_model=BlockResponse, status_code=status.HTTP_201_CREATED)
async def create_block(
    block_data: BlockCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new block"""
    # Check condominium access
    if not check_condominium_access(db, current_user, block_data.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    # Check if user has admin role
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if Role.ADMIN not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create blocks"
        )
    
    # Verify condominium exists
    condominium = db.query(Condominium).filter(Condominium.id == block_data.condominium_id).first()
    if not condominium:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Condominium not found"
        )
    
    # Check if block name already exists for this condominium
    existing = db.query(Block).filter(
        Block.condominium_id == block_data.condominium_id,
        Block.name == block_data.name
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A block with this name already exists in this condominium"
        )
    
    block = Block(**block_data.model_dump())
    db.add(block)
    db.commit()
    db.refresh(block)
    
    return block


@router.get("/condominium/{condominium_id}", response_model=List[BlockResponse])
async def get_blocks_by_condominium(
    condominium_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all blocks for a condominium"""
    if not check_condominium_access(db, current_user, condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this condominium"
        )
    
    blocks = db.query(Block).filter(Block.condominium_id == condominium_id).order_by(Block.name).all()
    return blocks


@router.get("/{block_id}", response_model=BlockResponse)
async def get_block(
    block_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific block"""
    block = db.query(Block).filter(Block.id == block_id).first()
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Block not found"
        )
    
    if not check_condominium_access(db, current_user, block.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this block"
        )
    
    return block


@router.put("/{block_id}", response_model=BlockResponse)
async def update_block(
    block_id: int,
    block_data: BlockUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a block"""
    block = db.query(Block).filter(Block.id == block_id).first()
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Block not found"
        )
    
    if not check_condominium_access(db, current_user, block.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this block"
        )
    
    # Check if user has admin role
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if Role.ADMIN not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update blocks"
        )
    
    # Check if name is being changed and already exists
    update_data = block_data.model_dump(exclude_unset=True)
    if 'name' in update_data and update_data['name'] != block.name:
        existing = db.query(Block).filter(
            Block.condominium_id == block.condominium_id,
            Block.name == update_data['name'],
            Block.id != block_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A block with this name already exists in this condominium"
            )
    
    for field, value in update_data.items():
        setattr(block, field, value)
    
    db.commit()
    db.refresh(block)
    
    return block


@router.delete("/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_block(
    block_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a block"""
    block = db.query(Block).filter(Block.id == block_id).first()
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Block not found"
        )
    
    if not check_condominium_access(db, current_user, block.condominium_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this block"
        )
    
    # Check if user has admin role
    user_roles = [ur.role.name for ur in current_user.user_roles]
    if Role.ADMIN not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete blocks"
        )
    
    # Check if block has properties
    if block.properties:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete block that has properties assigned. Please reassign properties first."
        )
    
    db.delete(block)
    db.commit()
    
    return None

