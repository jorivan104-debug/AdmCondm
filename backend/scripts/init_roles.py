"""
Script to initialize roles in the database
Run this after creating the database tables
"""
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.role import Role


def init_roles():
    """Initialize default roles"""
    db: Session = SessionLocal()
    
    roles = [
        {"name": "super_admin", "description": "Super Administrator with full system access and user management"},
        {"name": "admin", "description": "Administrator with full access to assigned condominiums"},
        {"name": "asesor", "description": "Asesor con permisos limitados, asignable por administrador o superadministrador"},
        {"name": "titular", "description": "Titular de propiedad"},
        {"name": "residente", "description": "Residente del condominio"},
        {"name": "accountant", "description": "Accountant with full accounting access"},
        {"name": "accounting_assistant", "description": "Accounting assistant with limited accounting access"},
        {"name": "user", "description": "Regular user with read access and space request management"},
    ]
    
    for role_data in roles:
        existing_role = db.query(Role).filter(Role.name == role_data["name"]).first()
        if not existing_role:
            role = Role(**role_data)
            db.add(role)
            print(f"Created role: {role_data['name']}")
        else:
            print(f"Role already exists: {role_data['name']}")
    
    db.commit()
    db.close()
    print("Roles initialization completed!")


if __name__ == "__main__":
    init_roles()

