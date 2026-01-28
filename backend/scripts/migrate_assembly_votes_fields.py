"""
Script to add option_votes field to assembly_votes table
For SQLite databases, we need to recreate the table to add new columns
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import create_engine, text, inspect
from app.core.config import settings
from app.core.database import engine

def migrate_assembly_votes_fields():
    """Add option_votes column to assembly_votes table"""
    
    # Check if using SQLite
    if not settings.DATABASE_URL.startswith("sqlite"):
        print("This migration is for SQLite. For PostgreSQL, use Alembic migrations.")
        return
    
    print("Checking assembly_votes table structure...")
    
    inspector = inspect(engine)
    
    # Check if assembly_votes table exists
    if 'assembly_votes' not in inspector.get_table_names():
        print("[INFO] Table 'assembly_votes' does not exist. It will be created automatically.")
        return
    
    columns = [col['name'] for col in inspector.get_columns('assembly_votes')]
    print(f"  Existing columns: {', '.join(columns)}")
    
    needs_migration = False
    if 'option_votes' not in columns:
        print("  - Missing column: option_votes")
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
            conn.execute(text("DROP TABLE IF EXISTS assembly_votes_backup"))
            
            # Create backup table with new structure
            print("  Creating backup table...")
            conn.execute(text("""
                CREATE TABLE assembly_votes_backup (
                    id INTEGER PRIMARY KEY,
                    assembly_id INTEGER NOT NULL,
                    topic VARCHAR(255) NOT NULL,
                    description TEXT,
                    vote_type VARCHAR(50) DEFAULT 'custom',
                    options TEXT,
                    option_votes TEXT,
                    total_votes INTEGER DEFAULT 0,
                    yes_votes INTEGER DEFAULT 0,
                    no_votes INTEGER DEFAULT 0,
                    abstain_votes INTEGER DEFAULT 0,
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME,
                    FOREIGN KEY (assembly_id) REFERENCES assemblies(id)
                )
            """))
            
            # Copy data from old table to backup - only copy columns that exist
            print("  Copying data...")
            
            # Build column lists dynamically based on what exists
            source_cols = []
            target_cols = []
            
            # Always include these columns (check if they exist)
            base_cols = ['id', 'assembly_id', 'topic', 'description', 'vote_type', 
                        'options', 'total_votes', 'yes_votes', 'no_votes', 
                        'abstain_votes', 'is_active', 'created_at', 'updated_at']
            
            for col in base_cols:
                if col in columns:
                    source_cols.append(col)
                    target_cols.append(col)
            
            # Add optional column if it exists
            if 'option_votes' in columns:
                source_cols.append('option_votes')
                target_cols.append('option_votes')
            
            if not source_cols:
                print("[ERROR] No columns found to copy!")
                trans.rollback()
                return
            
            # Build SQL dynamically
            source_cols_str = ', '.join(source_cols)
            target_cols_str = ', '.join(target_cols)
            
            copy_sql = f"""
                INSERT INTO assembly_votes_backup ({target_cols_str})
                SELECT {source_cols_str}
                FROM assembly_votes
            """
            
            print(f"  Copying columns: {source_cols_str}")
            conn.execute(text(copy_sql))
            
            # Drop old table
            print("  Dropping old table...")
            conn.execute(text("DROP TABLE assembly_votes"))
            
            # Rename backup to original
            print("  Renaming backup table...")
            conn.execute(text("ALTER TABLE assembly_votes_backup RENAME TO assembly_votes"))
            
            # Recreate indexes
            print("  Recreating indexes...")
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_assembly_votes_id ON assembly_votes(id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_assembly_votes_assembly_id ON assembly_votes(assembly_id)"))
            
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
    migrate_assembly_votes_fields()
