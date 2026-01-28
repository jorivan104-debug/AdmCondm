"""
Limpia toda la base de datos y conserva solo el usuario superadministrador
y sus accesos (login + rol super_admin).

Uso: desde la carpeta backend ejecutar
  python scripts/clean_database_keep_superadmin.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.user import User, UserRole, UserCondominium
from app.models.role import Role
from app.models.condominium import Condominium
from app.models.block import Block
from app.models.property import Property, PropertyResident
from app.models.resident import Resident
from app.models.accounting import AccountingTransaction, Budget, BankReconciliation
from app.models.space_request import SpaceRequest
from app.models.meeting import Meeting, MeetingAttendance
from app.models.assembly import Assembly, AssemblyVote, VoteRecord, AssemblyAttendance
from app.models.administration_invoice import AdministrationInvoice, InvoicePayment
from app.models.document import Document
from app.models.document_attachment import DocumentAttachment
from app.models.notification import Notification


def clean_database_keep_superadmin():
    db: Session = SessionLocal()
    try:
        # 1. Identificar al usuario superadministrador (el que tiene rol super_admin)
        super_admin_role = db.query(Role).filter(Role.name == "super_admin").first()
        if not super_admin_role:
            print("[ERROR] No existe el rol 'super_admin' en la base de datos.")
            print("        Ejecuta primero: python scripts/init_roles.py")
            return
        super_admin_user_id = (
            db.query(UserRole.user_id)
            .filter(UserRole.role_id == super_admin_role.id)
            .first()
        )
        if not super_admin_user_id:
            print("[ERROR] No hay ningún usuario con rol super_admin.")
            print("        Crea uno antes de limpiar o usa set_admin_user / create_super_admin.")
            return
        super_admin_user_id = super_admin_user_id[0]
        super_user = db.query(User).filter(User.id == super_admin_user_id).first()
        print(f"[OK] Usuario superadministrador a conservar: id={super_admin_user_id}, email={super_user.email}")

        # 2. Borrar en orden (tablas hijas primero) respetando FKs
        def _delete(model, label, extra_filter=None):
            q = db.query(model)
            if extra_filter is not None:
                q = q.filter(extra_filter)
            n = q.delete(synchronize_session=False)
            if n:
                print(f"  [OK] {label}: {n} fila(s) eliminada(s)")

        # Asambleas y votos
        _delete(VoteRecord, "vote_records")
        _delete(AssemblyAttendance, "assembly_attendances")
        _delete(AssemblyVote, "assembly_votes")
        _delete(Assembly, "assemblies")

        # Reuniones
        _delete(MeetingAttendance, "meeting_attendances")
        _delete(Meeting, "meetings")

        # Facturación
        _delete(InvoicePayment, "invoice_payments")
        _delete(AdministrationInvoice, "administration_invoices")

        # Documentos y adjuntos
        _delete(DocumentAttachment, "document_attachments")
        _delete(Document, "documents")

        # Notificaciones y solicitudes
        _delete(Notification, "notifications")
        _delete(SpaceRequest, "space_requests")

        # Contabilidad
        _delete(BankReconciliation, "bank_reconciliations")
        _delete(Budget, "budgets")
        _delete(AccountingTransaction, "accounting_transactions")

        # Propiedades y residentes
        _delete(PropertyResident, "property_residents")
        _delete(Resident, "residents")
        _delete(Property, "properties")
        _delete(Block, "blocks")

        # Condominios y asignaciones usuario-condominio
        _delete(UserCondominium, "user_condominiums")
        _delete(Condominium, "condominiums")

        # Roles de usuario: solo borrar los que NO son del super_admin
        _delete(UserRole, "user_roles (otros)", UserRole.user_id != super_admin_user_id)

        # Usuarios: solo borrar los que NO son el super_admin
        _delete(User, "users (otros)", User.id != super_admin_user_id)

        # La tabla 'roles' se mantiene intacta

        db.commit()
        print("\n[OK] Base de datos limpiada. Solo se conservan:")
        print("     - El usuario superadministrador (email, contraseña, perfil)")
        print("     - Su rol super_admin (user_roles)")
        print("     - La tabla de roles (roles)")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("Limpiando base de datos (se conserva solo el superadministrador)...\n")
    clean_database_keep_superadmin()
    print("\nListo.")
