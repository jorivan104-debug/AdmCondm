"""
Add expense_type column to accounting_transactions if missing.
SQLite: ALTER TABLE ADD COLUMN.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import text, inspect
from app.core.database import engine


def migrate():
    insp = inspect(engine)
    cols = [c["name"] for c in insp.get_columns("accounting_transactions")]
    if "expense_type" in cols:
        print("expense_type already exists, skip.")
        return
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE accounting_transactions ADD COLUMN expense_type VARCHAR(50)"))
        conn.commit()
    print("Added accounting_transactions.expense_type.")


if __name__ == "__main__":
    migrate()
