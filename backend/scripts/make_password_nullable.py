"""
Script to make hashed_password nullable in users table
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import text
from app.core.database import engine

def make_password_nullable():
    """Make hashed_password column nullable"""
    try:
        with engine.connect() as conn:
            # Try PostgreSQL syntax first
            try:
                conn.execute(text("ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL"))
                conn.commit()
                print("[OK] Campo hashed_password ahora es nullable (PostgreSQL)")
            except Exception as e:
                # Try SQLite syntax
                try:
                    # SQLite doesn't support ALTER COLUMN, need to recreate table
                    print("[INFO] SQLite detectado, se requiere recrear la tabla")
                    print("[INFO] Por favor, ejecuta las migraciones de Alembic o recrea la base de datos")
                except Exception as e2:
                    print(f"[ERROR] Error: {e2}")
    except Exception as e:
        print(f"[ERROR] Error general: {e}")

if __name__ == "__main__":
    make_password_nullable()
