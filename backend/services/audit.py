import logging
from typing import Optional
from sqlalchemy.orm import Session
from backend.models.audit_log import AuditLog

logger = logging.getLogger("policylens.audit")


class AuditService:
    """
    Servicio centralizado de auditoría y compliance (ISO 27001 / GDPR).
    Registra eventos en base de datos SQLite/PostgreSQL y emite logs estructurados.
    """

    @staticmethod
    def registrar_evento(
        db: Session,
        action: str,
        resource: str,
        user_id: Optional[int] = None,
        user_email: Optional[str] = None,
        ip_address: Optional[str] = None,
        status: str = "SUCCESS",
        details: Optional[str] = None
    ) -> Optional[AuditLog]:
        try:
            log_entry = AuditLog(
                user_id=user_id,
                user_email=user_email,
                action=action,
                resource=resource,
                ip_address=ip_address,
                status=status,
                details=details
            )
            db.add(log_entry)
            db.commit()
            db.refresh(log_entry)

            logger.info(
                f"[AUDIT] Action={action} Resource={resource} User={user_email or user_id or 'anon'} "
                f"IP={ip_address} Status={status}"
            )
            return log_entry
        except Exception as e:
            logger.warning(f"Error al guardar log de auditoría en BD: {e}")
            db.rollback()
            return None
