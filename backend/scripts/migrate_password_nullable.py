"""
Script to migrate users table to make hashed_password nullable
Works with SQLite by recreating the table
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import text, inspect
from app.core.database import engine, Base
from app.models.user import User

def migrate_password_nullable():
    """Make hashed_password nullable by recreating table if needed"""
    try:
        with engine.connect() as conn:
            # Check if column exists and is NOT NULL
            inspector = inspect(engine)
            columns = {col['name']: col for col in inspector.get_columns('users')}
            
            if 'hashed_password' in columns:
                is_nullable = columns['hashed_password']['nullable']
                
                if not is_nullable:
                    print("[INFO] Campo hashed_password es NOT NULL, iniciando migración...")
                    
                    # For SQLite, we need to recreate the table
                    # Step 1: Create new table with nullable password
                    conn.execute(text("""
                        CREATE TABLE users_new (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            email VARCHAR(255) NOT NULL UNIQUE,
                            hashed_password VARCHAR(255),
                            full_name VARCHAR(255),
                            photo_url VARCHAR(500),
                            is_active BOOLEAN DEFAULT 1,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME
                        )
                    """))
                    
                    # Step 2: Copy data (keep existing passwords)
                    conn.execute(text("""
                        INSERT INTO users_new (id, email, hashed_password, full_name, photo_url, is_active, created_at, updated_at)
                        SELECT id, email, hashed_password, full_name, photo_url, is_active, created_at, updated_at
                        FROM users
                    """))
                    
                    # Step 3: Drop old table
                    conn.execute(text("DROP TABLE users"))
                    
                    # Step 4: Rename new table
                    conn.execute(text("ALTER TABLE users_new RENAME TO users"))
                    
                    # Step 5: Recreate indexes
                    conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email)"))
                    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_users_id ON users (id)"))
                    
                    conn.commit()
                    print("[OK] Migración completada: hashed_password ahora es nullable")
                else:
                    print("[INFO] Campo hashed_password ya es nullable, no se requiere migración")
            else:
                print("[ERROR] Columna hashed_password no encontrada en la tabla users")
                
    except Exception as e:
        print(f"[ERROR] Error en migración: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    migrate_password_nullable()
