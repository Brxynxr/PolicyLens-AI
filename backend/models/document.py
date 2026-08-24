from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from backend.database import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    original_name: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)  # "pdf", "docx", "html" o "htm"
    hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    size: Mapped[int] = mapped_column(Integer, nullable=False)  # en bytes
    upload_date: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    status: Mapped[str] = mapped_column(String, default="processed")  # "pending", "processed", "error"

    def __repr__(self) -> str:
        return f"<Document(id={self.id}, name='{self.name}', type='{self.type}', hash='{self.hash[:8]}...')>"
