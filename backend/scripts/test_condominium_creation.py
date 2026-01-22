"""
Test script to verify condominium creation works
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.condominium import Condominium
from app.models.user import User, UserCondominium

def test_condominium_creation():
    """Test creating a condominium"""
    db: Session = SessionLocal()
    
    try:
        # Get test user
        user = db.query(User).filter(User.email == "admin@test.com").first()
        if not user:
            print("Test user not found!")
            return
        
        print(f"Found user: {user.email}")
        
        # Check if user has admin role
        user_roles = [ur.role.name for ur in user.user_roles]
        print(f"User roles: {user_roles}")
        
        # Try to create a test condominium
        test_condo = Condominium(
            name="Test Condominium",
            short_name="Test",
            address="Test Address",
            city="Test City"
        )
        db.add(test_condo)
        db.commit()
        db.refresh(test_condo)
        
        print(f"Created test condominium with ID: {test_condo.id}")
        
        # Link user to condominium
        user_condo = UserCondominium(user_id=user.id, condominium_id=test_condo.id)
        db.add(user_condo)
        db.commit()
        
        print("User linked to condominium successfully")
        
        # Clean up
        db.delete(test_condo)
        db.commit()
        print("Test condominium deleted")
        
        print("\n[OK] Database operations working correctly!")
        
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    test_condominium_creation()

