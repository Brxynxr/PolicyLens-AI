import logging
import os
from dotenv import load_dotenv

# Cargar variables de ANTES de cualquier import que use os.getenv()
load_dotenv()

# Configurar logging estructurado para la aplicación
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("policylens")

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from backend.database import engine, Base, SessionLocal
import backend.models  # noqa: F401
from backend.routers.documents import router as documents_router
from backend.routers.sync import router as sync_router
from backend.routers.chat import router as chat_router
from backend.routers.auth import router as auth_router
from backend.routers.users import router as users_router
from backend.models.user import User

# Limiter global — disponible para los routers via request.app.state.limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gestión del ciclo de vida de la aplicación FastAPI.
    Crea las tablas en la BD si no existen e inicializa el usuario administrador.
    """
    Base.metadata.create_all(bind=engine)
    logger.info("Base de datos inicializada correctamente.")

    db = SessionLocal()
    try:
        admin_email = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@policylens.com")
        admin_password = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123")
        admin = db.query(User).filter(User.role == "admin").first()
        if not admin:
            db.add(User(
                nombre="Admin",
                email=admin_email,
                password=admin_password,
                role="admin"
            ))
            db.commit()
            logger.info(f"Usuario administrador creado por defecto ({admin_email}).")
    except Exception as e:
        logger.warning(f"Error al verificar usuario admin en arranque: {e}")
    finally:
        db.close()

    yield



app = FastAPI(
    title="PolicyLens-AI Backend",
    description="API Backend para el Navegador Inteligente de Políticas y Contratos Internos",
    version="1.0.0",
    lifespan=lifespan
)

# Fix #5: Attach rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configuración de CORS para permitir la conexión desde el Frontend React/Vite
cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:5173")
origins = [origin.strip() for origin in cors_origins_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
)

# Registrar Routers de la API
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(users_router, prefix="/users", tags=["Users"])
app.include_router(documents_router, prefix="/documents", tags=["Documents"])
app.include_router(sync_router, prefix="/documents", tags=["Sync"])
app.include_router(chat_router, prefix="/chat", tags=["Chat"])



@app.get("/")
def read_root():
    return {
        "message": "Bienvenido a PolicyLens-AI API",
        "status": "online",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
