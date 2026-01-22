"""
Script to set admin user credentials
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.models.role import Role
from app.core.security import get_password_hash


def set_admin_user():
    """Set admin user with specified credentials"""
    db: Session = SessionLocal()
    
    try:
        email = "jorivan104@hotmail.com"
        password = "e7sacxtf"
        full_name = "Administrador Principal"
        
        # Get or create super_admin role
        super_admin_role = db.query(Role).filter(Role.name == "super_admin").first()
        if not super_admin_role:
            print("Creating super_admin role...")
            super_admin_role = Role(name="super_admin", description="Super Administrator with full system access and user management")
            db.add(super_admin_role)
            db.flush()
        
        # Check if user already exists
        user = db.query(User).filter(User.email == email).first()
        
        if user:
            print(f"Updating existing user: {email}")
            # Update password
            user.hashed_password = get_password_hash(password)
            user.full_name = full_name
            user.is_active = True
            
            # Check if user has super_admin role
            existing_role = db.query(UserRole).filter(
                UserRole.user_id == user.id,
                UserRole.role_id == super_admin_role.id
            ).first()
            
            if not existing_role:
                # Remove all existing roles
                db.query(UserRole).filter(UserRole.user_id == user.id).delete()
                # Add super_admin role
                user_role = UserRole(user_id=user.id, role_id=super_admin_role.id)
                db.add(user_role)
                print("  - Assigned super_admin role")
        else:
            print(f"Creating new user: {email}")
            # Create new user
            hashed_password = get_password_hash(password)
            user = User(
                email=email,
                hashed_password=hashed_password,
                full_name=full_name,
                is_active=True
            )
            db.add(user)
            db.flush()
            
            # Assign super_admin role
            user_role = UserRole(user_id=user.id, role_id=super_admin_role.id)
            db.add(user_role)
            print("  - Created with super_admin role")
        
        db.commit()
        
        print("=" * 60)
        print("Admin user configured successfully!")
        print("=" * 60)
        print(f"Email: {email}")
        print(f"Password: {password}")
        print(f"Role: super_admin")
        print(f"Full Name: {full_name}")
        print("=" * 60)
        
    except Exception as e:
        db.rollback()
        print(f"Error setting admin user: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    set_admin_user()
