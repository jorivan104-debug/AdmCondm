"""
Script to add assembly_number and started_at fields to assemblies table
For SQLite databases, we need to recreate the table to add new columns
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import create_engine, text, inspect
from app.core.config import settings
from app.core.database import engine

def migrate_assembly_fields():
    """Add assembly_number and started_at columns to assemblies table"""
    
    # Check if using SQLite
    if not settings.DATABASE_URL.startswith("sqlite"):
        print("This migration is for SQLite. For PostgreSQL, use Alembic migrations.")
        return
    
    print("Checking assemblies table structure...")
    
    inspector = inspect(engine)
    
    # Check if assemblies table exists
    if 'assemblies' not in inspector.get_table_names():
        print("[INFO] Table 'assemblies' does not exist. It will be created automatically.")
        return
    
    columns = [col['name'] for col in inspector.get_columns('assemblies')]
    print(f"  Existing columns: {', '.join(columns)}")
    
    needs_migration = False
    if 'assembly_number' not in columns:
        print("  - Missing column: assembly_number")
        needs_migration = True
    if 'started_at' not in columns:
        print("  - Missing column: started_at")
        needs_migration = True
    if 'minutes' not in columns:
        print("  - Missing column: minutes")
        needs_migration = True
    
    if not needs_migration:
        print("[OK] All columns already exist. No migration needed.")
        return
    
    print("\nStarting migration...")
    
    with engine.connect() as conn:
        # Start transaction
        trans = conn.begin()
        
        try:
            # Drop backup table if it exists from previous failed migration
            print("  Cleaning up previous backup table if exists...")
            conn.execute(text("DROP TABLE IF EXISTS assemblies_backup"))
            
            # Create backup table with new structure
            print("  Creating backup table...")
            conn.execute(text("""
                CREATE TABLE assemblies_backup (
                    id INTEGER PRIMARY KEY,
                    condominium_id INTEGER NOT NULL,
                    assembly_number INTEGER,
                    title VARCHAR(255) NOT NULL,
                    scheduled_date DATETIME NOT NULL,
                    started_at DATETIME,
                    location VARCHAR(255),
                    agenda TEXT,
                    minutes TEXT,
                    required_quorum FLOAT NOT NULL DEFAULT 50.0,
                    current_quorum FLOAT DEFAULT 0.0,
                    status VARCHAR(50) DEFAULT 'scheduled',
                    is_active BOOLEAN DEFAULT 1,
                    created_by INTEGER NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME,
                    FOREIGN KEY (condominium_id) REFERENCES condominiums(id),
                    FOREIGN KEY (created_by) REFERENCES users(id)
                )
            """))
            
            # Copy data from old table to backup - only copy columns that exist
            print("  Copying data...")
            
            # Build column lists dynamically based on what exists
            source_cols = []
            target_cols = []
            
            # Always include these columns (check if they exist)
            base_cols = ['id', 'condominium_id', 'title', 'scheduled_date', 'location', 
                        'agenda', 'required_quorum', 'current_quorum', 'status', 
                        'is_active', 'created_by', 'created_at', 'updated_at']
            
            for col in base_cols:
                if col in columns:
                    source_cols.append(col)
                    target_cols.append(col)
            
            # Add optional columns if they exist
            optional_cols = ['assembly_number', 'started_at', 'minutes']
            for col in optional_cols:
                if col in columns:
                    source_cols.append(col)
                    target_cols.append(col)
            
            if not source_cols:
                print("[ERROR] No columns found to copy!")
                trans.rollback()
                return
            
            # Build SQL dynamically
            source_cols_str = ', '.join(source_cols)
            target_cols_str = ', '.join(target_cols)
            
            copy_sql = f"""
                INSERT INTO assemblies_backup ({target_cols_str})
                SELECT {source_cols_str}
                FROM assemblies
            """
            
            print(f"  Copying columns: {source_cols_str}")
            conn.execute(text(copy_sql))
            
            # Drop old table
            print("  Dropping old table...")
            conn.execute(text("DROP TABLE assemblies"))
            
            # Rename backup to original
            print("  Renaming backup table...")
            conn.execute(text("ALTER TABLE assemblies_backup RENAME TO assemblies"))
            
            # Recreate indexes
            print("  Recreating indexes...")
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_assemblies_id ON assemblies(id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_assemblies_condominium_id ON assemblies(condominium_id)"))
            
            # Commit transaction
            trans.commit()
            print("[OK] Migration completed successfully!")
            
        except Exception as e:
            trans.rollback()
            print(f"[ERROR] Migration failed: {e}")
            import traceback
            traceback.print_exc()
            raise

if __name__ == "__main__":
    migrate_assembly_fields()
