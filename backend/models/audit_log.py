from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Integer, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from backend.database import Base


class AuditLog(Base):
    """
    Registro inmutable de auditoría para compliance (ISO 27001 / GDPR):
    Registra quién realizó qué acción, sobre qué recurso, desde qué IP y cuándo.
    """
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), index=True
    )
    user_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    user_email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    resource: Mapped[str] = mapped_column(String(200), nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="SUCCESS")
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<AuditLog(id={self.id}, action='{self.action}', user='{self.user_email}', time='{self.timestamp}')>"
