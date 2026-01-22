"""
Script to create a test user
Run this after initializing roles
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.user import User, UserRole, UserCondominium
from app.models.role import Role
from app.models.condominium import Condominium
from app.core.security import get_password_hash


def create_test_user():
    """Create a test user with admin role"""
    db: Session = SessionLocal()
    
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == "admin@test.com").first()
        if existing_user:
            print("Test user already exists!")
            return
        
        # Create user
        hashed_password = get_password_hash("admin123")
        user = User(
            email="admin@test.com",
            hashed_password=hashed_password,
            full_name="Administrador de Prueba",
            is_active=True
        )
        db.add(user)
        db.flush()  # Get user.id
        
        # Get admin role
        admin_role = db.query(Role).filter(Role.name == "admin").first()
        if not admin_role:
            print("Error: Admin role not found. Please run init_roles.py first.")
            return
        
        # Assign admin role
        user_role = UserRole(user_id=user.id, role_id=admin_role.id)
        db.add(user_role)
        
        # Create a test condominium
        condominium = Condominium(
            name="Condominio de Prueba",
            address="Calle de Prueba 123",
            phone="+57 300 123 4567",
            email="test@condominio.com"
        )
        db.add(condominium)
        db.flush()  # Get condominium.id
        
        # Link user to condominium
        user_condo = UserCondominium(user_id=user.id, condominium_id=condominium.id)
        db.add(user_condo)
        
        db.commit()
        
        print("=" * 50)
        print("Test user created successfully!")
        print("=" * 50)
        print(f"Email: admin@test.com")
        print(f"Password: admin123")
        print(f"Role: admin")
        print(f"Condominium: {condominium.name}")
        print("=" * 50)
        
    except Exception as e:
        db.rollback()
        print(f"Error creating test user: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    create_test_user()

