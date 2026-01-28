from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.user import User
from app.models.role import Role
from app.schemas.auth import LoginRequest, RegisterRequest, Token, RefreshTokenRequest
from app.schemas.user import UserResponse, UserUpdate, UserDetailResponse, CondominiumInfo
from datetime import timedelta
from app.core.config import settings

router = APIRouter()
# Use auto_error=False to handle errors manually
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_user_by_email(db: Session, email: str) -> User:
    """Get user by email"""
    return db.query(User).filter(User.email == email).first()


def get_user_by_email_with_relations(db: Session, email: str) -> User | None:
    """Get user by email with user_roles and user_condominiums eager-loaded."""
    from app.models.user import UserRole, UserCondominium
    return (
        db.query(User)
        .options(
            joinedload(User.user_roles).joinedload(UserRole.role),
            joinedload(User.user_condominiums),
        )
        .filter(User.email == email)
        .first()
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if user already exists
    existing_user = get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Assign default role (user)
    default_role = db.query(Role).filter(Role.name == "user").first()
    if default_role:
        from app.models.user import UserRole
        user_role = UserRole(user_id=user.id, role_id=default_role.id)
        db.add(user_role)
        db.commit()
    
    return user


@router.post("/login", response_model=Token)
async def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """Login and get access token"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Login attempt for email: {credentials.email}")
        user = get_user_by_email(db, credentials.email)
        
        if not user:
            logger.warning(f"Login failed: User not found for email: {credentials.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        if not user.is_active:
            logger.warning(f"Login failed: User inactive for email: {credentials.email}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )
        
        # Check if user has no password set (new user)
        if not user.hashed_password:
            # Allow login without password for users without password
            if not credentials.password or credentials.password == "":
                logger.info(f"Login successful (no password set) for email: {credentials.email}")
                # Create tokens
                access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
                access_token = create_access_token(
                    data={"sub": user.email, "user_id": user.id, "needs_password_change": True},
                    expires_delta=access_token_expires
                )
                refresh_token = create_refresh_token(data={"sub": user.email, "user_id": user.id})
                
                return {
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "token_type": "bearer",
                    "needs_password_change": True
                }
            else:
                logger.warning(f"Login failed: Password provided but user has no password set for email: {credentials.email}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect email or password"
                )
        
        # Normal password verification
        # Check if password is provided when user has a password set
        if not credentials.password or credentials.password == "":
            logger.warning(f"Login failed: No password provided for email: {credentials.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        # Verify password
        try:
            password_valid = verify_password(credentials.password, user.hashed_password)
            if not password_valid:
                logger.warning(f"Login failed: Invalid password for email: {credentials.email}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect email or password"
                )
        except HTTPException:
            raise
        except Exception as e:
            # Log the error for debugging
            logger.error(f"Error verifying password for email {credentials.email}: {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        # Create tokens
        logger.info(f"Login successful for email: {credentials.email}")
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email, "user_id": user.id},
            expires_delta=access_token_expires
        )
        refresh_token = create_refresh_token(data={"sub": user.email, "user_id": user.id})
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during login for email {credentials.email}: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error during login: {str(e)}"
        )


@router.post("/refresh", response_model=Token)
async def refresh_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refresh access token using refresh token"""
    payload = decode_token(request.refresh_token)
    
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    email = payload.get("sub")
    user = get_user_by_email(db, email)
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Create new tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "user_id": user.id},
        expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(data={"sub": user.email, "user_id": user.id})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        print("[AUTH] No token provided")
        raise credentials_exception
    
    try:
        print(f"[AUTH] Validating token: {token[:30] if len(token) > 30 else token}...")
        payload = decode_token(token)
        if not payload:
            print("[AUTH] Token decode failed: No payload")
            raise credentials_exception
        
        if payload.get("type") != "access":
            print(f"[AUTH] Token type mismatch: {payload.get('type')}")
            raise credentials_exception
        
        email = payload.get("sub")
        if email is None:
            print("[AUTH] No email in token payload")
            raise credentials_exception
        
        print(f"[AUTH] Looking up user: {email}")
        user = get_user_by_email_with_relations(db, email)
        if user is None:
            print(f"[AUTH] User not found: {email}")
            raise credentials_exception
        
        if not user.is_active:
            print(f"[AUTH] User inactive: {email}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )
        
        print(f"[AUTH] User authenticated successfully: {email}")
        return user
    except HTTPException:
        raise
    except Exception as e:
        print(f"[AUTH] Unexpected error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise credentials_exception


@router.get("/me", response_model=UserDetailResponse)
async def get_current_user_info(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user information with roles and condominiums"""
    try:
        # Reload user with relationships using joinedload to avoid lazy loading issues
        from app.models.user import UserRole, UserCondominium
        user = db.query(User)\
            .options(
                joinedload(User.user_roles).joinedload(UserRole.role),
                joinedload(User.user_condominiums).joinedload(UserCondominium.condominium)
            )\
            .filter(User.id == current_user.id)\
            .first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get user roles - handle cases where role might be None
        user_roles = []
        for ur in user.user_roles:
            if ur.role:
                user_roles.append({
                    "id": ur.role.id,
                    "name": ur.role.name,
                    "description": ur.role.description
                })
        role_names = [r["name"] for r in user_roles]
        is_titular_or_residente = "titular" in role_names or "residente" in role_names

        # Get user condominiums - for titular/residente include property_ids (units they are associated to)
        from app.models.resident import Resident
        from app.models.property import PropertyResident

        user_condominiums = []
        for uc in user.user_condominiums:
            if uc.condominium:
                property_ids: list = []
                if is_titular_or_residente:
                    residents = db.query(Resident).filter(
                        Resident.user_id == user.id,
                        Resident.condominium_id == uc.condominium.id
                    ).all()
                    for r in residents:
                        prs = db.query(PropertyResident).filter(PropertyResident.resident_id == r.id).all()
                        property_ids.extend([pr.property_id for pr in prs])
                    property_ids = list(dict.fromkeys(property_ids))
                user_condominiums.append(
                    CondominiumInfo(
                        id=uc.condominium.id,
                        name=uc.condominium.name,
                        property_ids=property_ids if is_titular_or_residente else None
                    )
                )
        
        # Build response
        return {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "photo_url": user.photo_url,
            "is_active": user.is_active,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
            "roles": user_roles,
            "condominiums": user_condominiums,
            "needs_password_change": not bool(user.hashed_password)
        }
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error getting user info: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving user information: {str(e)}"
        )


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user information"""
    if user_update.email is not None:
        # Check if email is already taken by another user
        existing_user = db.query(User).filter(User.email == user_update.email, User.id != current_user.id).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        current_user.email = user_update.email
    
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    
    if user_update.photo_url is not None:
        current_user.photo_url = user_update.photo_url
    
    db.commit()
    db.refresh(current_user)
    return current_user
