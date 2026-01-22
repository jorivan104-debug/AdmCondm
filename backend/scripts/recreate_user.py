"""
Script to recreate the test user with correct password hash
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


def recreate_user():
    """Recreate test user with correct password hash"""
    db: Session = SessionLocal()
    
    try:
        # Delete existing user if exists
        existing_user = db.query(User).filter(User.email == "admin@test.com").first()
        if existing_user:
            db.delete(existing_user)
            db.commit()
            print("Deleted existing user")
        
        # Create new user with correct hash
        hashed_password = get_password_hash("admin123")
        user = User(
            email="admin@test.com",
            hashed_password=hashed_password,
            full_name="Administrador de Prueba",
            is_active=True
        )
        db.add(user)
        db.flush()
        
        # Assign admin role
        admin_role = db.query(Role).filter(Role.name == "admin").first()
        if admin_role:
            user_role = UserRole(user_id=user.id, role_id=admin_role.id)
            db.add(user_role)
        
        # Get or create condominium
        condominium = db.query(Condominium).filter(Condominium.name == "Condominio de Prueba").first()
        if not condominium:
            condominium = Condominium(
                name="Condominio de Prueba",
                address="Calle de Prueba 123",
                phone="+57 300 123 4567",
                email="test@condominio.com"
            )
            db.add(condominium)
            db.flush()
        
        # Link user to condominium
        existing_link = db.query(UserCondominium).filter(
            UserCondominium.user_id == user.id,
            UserCondominium.condominium_id == condominium.id
        ).first()
        if not existing_link:
            user_condo = UserCondominium(user_id=user.id, condominium_id=condominium.id)
            db.add(user_condo)
        
        db.commit()
        
        print("=" * 60)
        print("User recreated successfully!")
        print("=" * 60)
        print("Email: admin@test.com")
        print("Password: admin123")
        print("=" * 60)
        
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    recreate_user()

