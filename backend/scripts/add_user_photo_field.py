"""
Script to add photo_url field to users table
Run this to update existing database
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import text
from app.core.database import engine

def add_photo_url_field():
    """Add photo_url column to users table if it doesn't exist"""
    try:
        with engine.connect() as conn:
            # Check if column exists (SQLite specific)
            result = conn.execute(text("PRAGMA table_info(users)"))
            columns = [row[1] for row in result]
            
            if 'photo_url' not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN photo_url VARCHAR(500)"))
                conn.commit()
                print("[OK] Campo photo_url agregado a la tabla users")
            else:
                print("[INFO] El campo photo_url ya existe en la tabla users")
    except Exception as e:
        print(f"[ERROR] {e}")
        # Try with PostgreSQL syntax
        try:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500)"))
                conn.commit()
                print("[OK] Campo photo_url agregado a la tabla users (PostgreSQL)")
        except Exception as e2:
            print(f"[ERROR] Error con PostgreSQL: {e2}")

if __name__ == "__main__":
    add_photo_url_field()
