"""
Script to create a super admin user
Run this after initializing roles
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.models.role import Role
from app.core.security import get_password_hash


def create_super_admin():
    """Create a super admin user"""
    db: Session = SessionLocal()
    
    try:
        # Check if super admin already exists
        super_admin_role = db.query(Role).filter(Role.name == "super_admin").first()
        if not super_admin_role:
            print("Error: super_admin role not found. Please run init_roles.py first.")
            return
        
        # Check if super admin user already exists
        existing_super_admin = db.query(User).join(UserRole).filter(
            UserRole.role_id == super_admin_role.id
        ).first()
        
        if existing_super_admin:
            print("Super admin user already exists!")
            print(f"Email: {existing_super_admin.email}")
            return
        
        # Create super admin user
        email = input("Enter email for super admin (default: superadmin@admcondm.com): ").strip()
        if not email:
            email = "superadmin@admcondm.com"
        
        password = input("Enter password for super admin (default: superadmin123): ").strip()
        if not password:
            password = "superadmin123"
        
        full_name = input("Enter full name (default: Super Administrador): ").strip()
        if not full_name:
            full_name = "Super Administrador"
        
        hashed_password = get_password_hash(password)
        user = User(
            email=email,
            hashed_password=hashed_password,
            full_name=full_name,
            is_active=True
        )
        db.add(user)
        db.flush()  # Get user.id
        
        # Assign super_admin role
        user_role = UserRole(user_id=user.id, role_id=super_admin_role.id)
        db.add(user_role)
        
        db.commit()
        
        print("=" * 50)
        print("Super admin user created successfully!")
        print("=" * 50)
        print(f"Email: {email}")
        print(f"Password: {password}")
        print(f"Role: super_admin")
        print("=" * 50)
        print("\n⚠️  IMPORTANT: Change the password after first login!")
        print("=" * 50)
        
    except Exception as e:
        db.rollback()
        print(f"Error creating super admin: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    create_super_admin()
