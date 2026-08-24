import os
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session

# Configuración de URL de la base de datos SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sql_app.db")

# Creación del motor de SQLAlchemy 2.0 (check_same_thread=False requerido por SQLite en aplicaciones web multihilo)
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

# Fábrica de sesiones
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Clase Base para modelos ORM utilizando la API DeclarativeBase de SQLAlchemy 2.0
class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    """
    Inyector de dependencia para obtener la sesión de la base de datos por cada request.
    Garantiza el cierre seguro de la conexión en un bloque finally.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
