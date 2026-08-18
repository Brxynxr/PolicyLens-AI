import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from backend.database import engine, Base
import backend.models  # noqa: F401
from backend.routers.documents import router as documents_router
from backend.routers.sync import router as sync_router

# Cargar variables de entorno desde .env si existe
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gestión del ciclo de vida de la aplicación FastAPI.
    Crea automáticamente las tablas en SQLite al iniciar el servidor.
    """
    Base.metadata.create_all(bind=engine)
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
app.include_router(documents_router, prefix="/documents", tags=["Documents"])
app.include_router(sync_router, prefix="/documents", tags=["Sync"])


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
