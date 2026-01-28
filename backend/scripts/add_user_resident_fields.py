"""
Añade a la tabla users los campos phone, document_type, document_number
(alineados con el formulario de residentes).
Ejecutar para actualizar una base de datos existente.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import text
from app.core.database import engine


def add_user_resident_fields():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("PRAGMA table_info(users)"))
            columns = [row[1] for row in result]
            for col, typ in [("phone", "VARCHAR(50)"), ("document_type", "VARCHAR(50)"), ("document_number", "VARCHAR(50)")]:
                if col not in columns:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {typ}"))
                    conn.commit()
                    print(f"[OK] Campo {col} agregado a la tabla users")
                else:
                    print(f"[INFO] El campo {col} ya existe en la tabla users")
    except Exception as e:
        print(f"[INFO] SQLite: {e}")
        try:
            with engine.connect() as conn:
                for col, typ in [("phone", "VARCHAR(50)"), ("document_type", "VARCHAR(50)"), ("document_number", "VARCHAR(50)")]:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col} {typ}"))
                conn.commit()
                print("[OK] Campos phone, document_type, document_number agregados (PostgreSQL/compatible)")
        except Exception as e2:
            print(f"[ERROR] {e2}")


if __name__ == "__main__":
    add_user_resident_fields()
