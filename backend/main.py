import os
from dotenv import load_dotenv

# Cargar variables de ANTES de cualquier import que use os.getenv()
load_dotenv()

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import engine, Base, SessionLocal
import backend.models  # noqa: F401
from backend.routers.documents import router as documents_router
from backend.routers.sync import router as sync_router
from backend.routers.chat import router as chat_router
from backend.routers.auth import router as auth_router
from backend.routers.users import router as users_router
from backend.models.user import User


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gestión del ciclo de vida de la aplicación FastAPI.
    Crea automáticamente las tablas en SQLite al iniciar el servidor.
    Crea el usuario admin por defecto si no existe.
    """
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    admin = db.query(User).filter(User.role == "admin").first()
    if not admin:
        db.add(User(
            nombre="Admin",
            email="admin@policylens.com",
            password="admin123",
            role="admin"
        ))
        db.commit()
    db.close()

    yield


app = FastAPI(
    title="PolicyLens-AI Backend",
    description="API Backend para el Navegador Inteligente de Políticas y Contratos Internos",
    version="1.0.0",
    lifespan=lifespan
)

# Configuración de CORS para permitir la conexión desde el Frontend React/Vite
cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:5173")
origins = [origin.strip() for origin in cors_origins_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
