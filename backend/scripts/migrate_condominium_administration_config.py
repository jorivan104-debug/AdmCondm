"""
Add administration_value_type and administration_value_cop columns to condominiums.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text, inspect
from app.core.config import settings


def migrate():
    engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
    inspector = inspect(engine)

    if "condominiums" not in inspector.get_table_names():
        print("[INFO] Table 'condominiums' does not exist. Skipping.")
        return

    cols = {c["name"] for c in inspector.get_columns("condominiums")}

    with engine.begin() as conn:
        if "administration_value_type" not in cols:
            conn.execute(text("ALTER TABLE condominiums ADD COLUMN administration_value_type VARCHAR(20)"))
            print("[OK] Added administration_value_type")
        else:
            print("[INFO] administration_value_type already exists.")

        if "administration_value_cop" not in cols:
            conn.execute(text("ALTER TABLE condominiums ADD COLUMN administration_value_cop INTEGER"))
            print("[OK] Added administration_value_cop")
        else:
            print("[INFO] administration_value_cop already exists.")

    print("[SUCCESS] Migration completed.")


if __name__ == "__main__":
    migrate()
