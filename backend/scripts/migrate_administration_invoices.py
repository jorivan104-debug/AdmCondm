"""
Script to create administration_invoices and invoice_payments tables for SQLite
Since SQLite doesn't support ALTER COLUMN, we'll create the tables directly
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text, inspect
from app.core.database import Base
from app.core.config import settings
from app.models.administration_invoice import AdministrationInvoice, InvoicePayment

def migrate():
    engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
    
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    # Check if tables already exist
    if 'administration_invoices' in existing_tables:
        print("[INFO] Table 'administration_invoices' already exists. Skipping creation.")
    else:
        print("[INFO] Creating 'administration_invoices' table...")
        AdministrationInvoice.__table__.create(engine, checkfirst=True)
        print("[SUCCESS] Table 'administration_invoices' created successfully!")
    
    if 'invoice_payments' in existing_tables:
        print("[INFO] Table 'invoice_payments' already exists. Skipping creation.")
    else:
        print("[INFO] Creating 'invoice_payments' table...")
        InvoicePayment.__table__.create(engine, checkfirst=True)
        print("[SUCCESS] Table 'invoice_payments' created successfully!")
    
    print("\n[SUCCESS] Migration completed!")

if __name__ == "__main__":
    migrate()
