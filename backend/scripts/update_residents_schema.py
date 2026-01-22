"""
Script to update residents table with new field (photo_url)
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import inspect, text
from app.core.database import engine, Base, SessionLocal
from app.models.resident import Resident

def update_residents_schema():
    """Update residents table schema"""
    print("Checking residents table schema...")
    
    # Create all tables (this will add new tables if they don't exist)
    Base.metadata.create_all(bind=engine)
    
    # Check if new columns exist
    db = SessionLocal()
    try:
        inspector = inspect(engine)
        
        # Check if residents table exists
        tables = inspector.get_table_names()
        if 'residents' not in tables:
            print("[ERROR] Residents table does not exist!")
            return
        
        columns = [col['name'] for col in inspector.get_columns('residents')]
        print(f"Existing columns: {columns}")
        
        new_fields = ['photo_url']
        
        missing_fields = [field for field in new_fields if field not in columns]
        
        if missing_fields:
            print(f"\nMissing fields: {missing_fields}")
            print("Attempting to add missing columns...")
            
            for field in missing_fields:
                try:
                    # Get field type from model
                    column = getattr(Resident, field)
                    
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
                    db.execute(text(f"ALTER TABLE residents ADD COLUMN {field} {sql_type}"))
                    db.commit()
                    print(f"  [OK] Added column: {field} ({sql_type})")
                except Exception as e:
                    if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                        print(f"  [SKIP] Column {field} already exists")
                    else:
                        print(f"  [ERROR] Could not add column {field}: {e}")
                    db.rollback()
        else:
            print("\n[OK] All new fields exist in database")
        
        print("\n" + "=" * 60)
        print("Residents schema update completed!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n[ERROR] {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    update_residents_schema()

