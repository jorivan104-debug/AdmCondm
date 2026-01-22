"""
Script to initialize the database
This script will:
1. Create all tables
2. Initialize roles
3. Create a test user with admin role
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy.orm import Session
from app.core.database import engine, Base, SessionLocal
from app.models import *
from app.core.security import get_password_hash


def init_database():
    """Initialize database with tables, roles, and test user"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("[OK] Tables created")
    
    db: Session = SessionLocal()
    
    try:
        # Initialize roles
        print("\nInitializing roles...")
        roles = [
            {"name": "super_admin", "description": "Super Administrator with full system access and user management"},
            {"name": "admin", "description": "Administrator with full access to assigned condominiums"},
            {"name": "accountant", "description": "Accountant with full accounting access"},
            {"name": "accounting_assistant", "description": "Accounting assistant with limited accounting access"},
            {"name": "user", "description": "Regular user with read access and space request management"},
        ]
        
        for role_data in roles:
            existing_role = db.query(Role).filter(Role.name == role_data["name"]).first()
            if not existing_role:
                role = Role(**role_data)
                db.add(role)
                print(f"  [OK] Created role: {role_data['name']}")
            else:
                print(f"  [-] Role already exists: {role_data['name']}")
        
        db.commit()
        print("[OK] Roles initialized")
        
        # Create test user
        print("\nCreating test user...")
        existing_user = db.query(User).filter(User.email == "admin@test.com").first()
        if existing_user:
            print("  - Test user already exists!")
        else:
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
            
            # Create a test condominium
            condominium = Condominium(
                name="Condominio de Prueba",
                address="Calle de Prueba 123",
                phone="+57 300 123 4567",
                email="test@condominio.com"
            )
            db.add(condominium)
            db.flush()
            
            # Link user to condominium
            user_condo = UserCondominium(user_id=user.id, condominium_id=condominium.id)
            db.add(user_condo)
            
            db.commit()
            print("  [OK] Test user created")
            print("  [OK] Test condominium created")
        
        print("\n" + "=" * 60)
        print("Database initialization completed!")
        print("=" * 60)
        print("\nTest user credentials:")
        print("  Email: admin@test.com")
        print("  Password: admin123")
        print("  Role: admin")
        print("=" * 60)
        
    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_database()

