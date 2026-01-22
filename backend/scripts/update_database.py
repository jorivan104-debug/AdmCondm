"""
Script to update database schema with new Condominium fields
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import inspect, text
from app.core.database import engine, Base, SessionLocal
from app.models import *

def update_database():
    """Update database schema"""
    print("Checking database schema...")
    
    # Create all tables (this will add new columns if they don't exist in SQLite)
    Base.metadata.create_all(bind=engine)
    print("[OK] Database schema updated")
    
    # Check if new columns exist
    db = SessionLocal()
    try:
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('condominiums')]
        
        new_fields = [
            'short_name', 'city', 'state', 'country', 'postal_code',
            'administrator_name', 'administrator_phone', 'administrator_email',
            'logo_url', 'landscape_image_url', 'description', 'total_units'
        ]
        
        missing_fields = [field for field in new_fields if field not in columns]
        
        if missing_fields:
            print(f"\nMissing fields: {missing_fields}")
            print("Attempting to add missing columns...")
            
            for field in missing_fields:
                try:
                    # Get field type from model
                    condominium_model = Condominium
                    column = getattr(condominium_model, field)
                    
                    # Determine SQL type
                    column_type_str = str(column.type)
                    if 'INTEGER' in column_type_str:
                        sql_type = "INTEGER"
                    elif 'TEXT' in column_type_str or 'Text' in column_type_str:
                        sql_type = "TEXT"
                    elif hasattr(column.type, 'length') and column.type.length:
                        sql_type = f"VARCHAR({column.type.length})"
                    else:
                        sql_type = "TEXT"
                    
                    # Add column
                    db.execute(text(f"ALTER TABLE condominiums ADD COLUMN {field} {sql_type}"))
                    db.commit()
                    print(f"  [OK] Added column: {field}")
                except Exception as e:
                    print(f"  [ERROR] Could not add column {field}: {e}")
                    db.rollback()
        else:
            print("\n[OK] All new fields exist in database")
        
        print("\n" + "=" * 60)
        print("Database update completed!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n[ERROR] {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    update_database()

