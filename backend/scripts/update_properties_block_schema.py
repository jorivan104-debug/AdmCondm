"""
Script to update properties table: change block from String to ForeignKey (block_id)
This is a migration script that will:
1. Create blocks table
2. Create block_id column in properties
3. Migrate existing block string values to Block entities
4. Drop old block column
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import inspect, text, create_engine
from app.core.database import engine, Base, SessionLocal
from app.core.config import settings
from app.models.block import Block
from app.models.property import Property

def update_properties_block_schema():
    """Migrate block from String to ForeignKey"""
    print("Migrating properties.block to properties.block_id...")
    
    db = SessionLocal()
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        # Create blocks table if it doesn't exist
        if 'blocks' not in tables:
            print("Creating blocks table...")
            Base.metadata.create_all(bind=engine, tables=[Block.__table__])
            print("  [OK] Blocks table created")
        else:
            print("[OK] Blocks table already exists")
        
        # Check if block_id column exists
        properties_columns = [col['name'] for col in inspector.get_columns('properties')]
        
        if 'block_id' not in properties_columns:
            print("\nAdding block_id column to properties table...")
            db.execute(text("ALTER TABLE properties ADD COLUMN block_id INTEGER"))
            db.commit()
            print("  [OK] block_id column added")
        else:
            print("[OK] block_id column already exists")
        
        # Migrate existing block string values to Block entities if block column exists
        if 'block' in properties_columns:
            print("\nMigrating existing block string values...")
            
            # Get unique block values
            result = db.execute(text("SELECT DISTINCT block FROM properties WHERE block IS NOT NULL AND block != ''"))
            unique_blocks = [row[0] for row in result.fetchall()]
            
            print(f"Found {len(unique_blocks)} unique block values")
            
            # Get condominium_id for creating blocks
            result = db.execute(text("SELECT DISTINCT condominium_id FROM properties"))
            condominium_ids = [row[0] for row in result.fetchall()]
            
            for condominium_id in condominium_ids:
                # Get block values for this condominium
                result = db.execute(text(
                    "SELECT DISTINCT block FROM properties WHERE condominium_id = :cond_id AND block IS NOT NULL AND block != ''"
                ), {"cond_id": condominium_id})
                condo_blocks = [row[0] for row in result.fetchall()]
                
                for block_name in condo_blocks:
                    # Check if block already exists
                    existing_block = db.execute(text(
                        "SELECT id FROM blocks WHERE condominium_id = :cond_id AND name = :name"
                    ), {"cond_id": condominium_id, "name": block_name}).fetchone()
                    
                    if not existing_block:
                        # Create block
                        db.execute(text(
                            "INSERT INTO blocks (condominium_id, name, created_at) VALUES (:cond_id, :name, datetime('now'))"
                        ), {"cond_id": condominium_id, "name": block_name})
                        db.commit()
                        print(f"  [OK] Created block '{block_name}' for condominium {condominium_id}")
                    
                    # Get block ID
                    block_result = db.execute(text(
                        "SELECT id FROM blocks WHERE condominium_id = :cond_id AND name = :name"
                    ), {"cond_id": condominium_id, "name": block_name}).fetchone()
                    
                    if block_result:
                        block_id = block_result[0]
                        # Update properties with this block name
                        db.execute(text(
                            "UPDATE properties SET block_id = :block_id WHERE condominium_id = :cond_id AND block = :block_name"
                        ), {"block_id": block_id, "cond_id": condominium_id, "block_name": block_name})
                        db.commit()
                        print(f"  [OK] Updated properties with block '{block_name}' to block_id {block_id}")
            
            print("\n[OK] Migration completed")
            print("\nNOTE: The old 'block' column still exists. You can drop it manually after verifying the migration:")
            print("  ALTER TABLE properties DROP COLUMN block")
        else:
            print("\n[OK] Old 'block' column not found - migration already completed")
        
        print("\n" + "=" * 60)
        print("Properties block schema update completed!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n[ERROR] {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    update_properties_block_schema()

