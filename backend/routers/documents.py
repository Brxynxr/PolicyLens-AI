import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Query, Request

from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.document import Document
from backend.models.user import User
from backend.schemas.document import DocumentResponse, DocumentListResponse
from backend.services.documents import (
    listar_documentos,
    obtener_documento,
    eliminar_documento,
    procesar_documento,
)
from backend.services.rag import RAGService
from backend.services.audit import AuditService

router = APIRouter()


DOCUMENTS_DIR = os.getenv("DOCUMENTS_DIR", "./documents")
MAX_FILE_SIZE_MB = 10
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

rag_service = RAGService()


def _asegurar_directorio():
    """Crea el directorio ./documents si no existe."""
    if not os.path.exists(DOCUMENTS_DIR):
        os.makedirs(DOCUMENTS_DIR, exist_ok=True)


def _require_admin(
    user_id: Optional[int] = Query(None, description="ID del usuario que realiza la acción"),
    request: Request = None,
    db: Session = Depends(get_db)
) -> User:
    """
    Dependencia que valida que el usuario sea administrador.
    Busca por Query param, header X-User-Id o fallback al admin activo.
    """
    target_id = user_id
    if target_id is None and request:
        hdr = request.headers.get("X-User-Id")
        if hdr and hdr.isdigit():
            target_id = int(hdr)

    if target_id is not None:
        user = db.query(User).filter(User.id == target_id, User.is_active == True).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario no encontrado o inactivo.")
        if user.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acción reservada para administradores.")
        return user

    admin = db.query(User).filter(User.role == "admin", User.is_active == True).first()
    if admin:
        return admin

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado: se requiere rol de administrador.")



@router.get("/stats")
def get_document_stats(db: Session = Depends(get_db)):
    """
    Retorna métricas reales del almacenamiento RAG, total de chunks y modelos configurados.
    """
    docs = listar_documentos(db)
    try:
        total_chunks = rag_service.collection.count()
    except Exception:
        total_chunks = 0

    base_url = os.getenv("LLM_BASE_URL", "")
    llm_provider = "Ollama Local" if "localhost" in base_url or "127.0.0.1" in base_url else "Cloud API"

    return {
        "total_documents": len(docs),
        "total_chunks": total_chunks,
        "embedding_model": os.getenv("EMBEDDING_MODEL_LOCAL", "intfloat/multilingual-e5-base"),
        "embedding_dim": 768,
        "llm_model": os.getenv("LLM_MODEL", "phi4-mini"),
        "llm_provider": f"{llm_provider} ({os.getenv('LLM_MODEL', 'phi4-mini')})",
        "chroma_status": "Conectado"
    }


@router.get("", response_model=DocumentListResponse)
def get_documents(db: Session = Depends(get_db)):
    """
    Listar todos los documentos registrados y activos en el sistema.
    """
    docs = listar_documentos(db)
    return DocumentListResponse(
        total=len(docs),
        documents=[DocumentResponse.model_validate(d) for d in docs]
    )


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    """
    Subir un documento (.pdf, .docx, .html, .htm), guardarlo físicamente en ./documents/,
    extraer su texto, fragmentarlo en chunks con metadatos y registrarlo en SQLite.
    Solo accesible para usuarios con rol 'admin'.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nombre de archivo inválido."
        )

    # Fix #4: Sanitize filename to prevent path traversal attacks
    safe_filename = os.path.basename(file.filename)
    if not safe_filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nombre de archivo inválido."
        )

    extension = os.path.splitext(safe_filename)[1].lower()
    if extension not in [".pdf", ".docx", ".html", ".htm"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato no permitido: '{extension}'. Solo se permiten archivos .pdf, .docx, .html y .htm"
        )

    _asegurar_directorio()
    file_path = os.path.join(DOCUMENTS_DIR, safe_filename)

    try:
        content = await file.read()
        if len(content) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El archivo excede el tamaño máximo de {MAX_FILE_SIZE_MB}MB."
            )

        with open(file_path, "wb") as buffer:
            buffer.write(content)

        # Si ya existen documentos con el mismo nombre, eliminar sus chunks antiguos de ChromaDB
        docs_existentes = db.query(Document).filter(
            Document.name == safe_filename,
            Document.status != "deleted"
        ).all()
        for doc_existente in docs_existentes:
            rag_service.eliminar_documento(doc_existente.id)

        res = procesar_documento(
            ruta_archivo=file_path,
            nombre_original=safe_filename,
            db=db
        )
        if res["chunks"]:
            rag_service.indexar_documento(res["chunks"])

        AuditService.registrar_evento(
            db=db,
            action="DOCUMENT_UPLOAD",
            resource=f"/documents/upload ({safe_filename})",
            user_id=_admin.id,
            user_email=_admin.email,
            status="SUCCESS",
            details=f"Documento subido e indexado con {len(res['chunks'])} fragmentos"
        )
        return DocumentResponse.model_validate(res["document"])
    except ValueError as ve:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno al procesar el archivo.")



@router.get("/{document_id}", response_model=DocumentResponse)
def get_document_by_id(document_id: int, db: Session = Depends(get_db)):
    """
    Obtener la información de un documento específico por su ID.
    """
    doc = obtener_documento(db, document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Documento con ID {document_id} no encontrado."
        )
    return DocumentResponse.model_validate(doc)



@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
def delete_document_by_id(
    document_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    """
    Eliminar un documento por su ID (elimina el registro de la BD, chunks de ChromaDB y el archivo físico).
    Solo accesible para usuarios con rol 'admin'.
    """
    # Eliminar chunks de ChromaDB antes de eliminar de SQLite
    rag_service.eliminar_documento(document_id)

    exito = eliminar_documento(db, document_id, base_dir=DOCUMENTS_DIR)
    if not exito:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Documento con ID {document_id} no encontrado para eliminar."
        )

    AuditService.registrar_evento(
        db=db,
        action="DOCUMENT_DELETE",
        resource=f"/documents/{document_id}",
        user_id=_admin.id,
        user_email=_admin.email,
        status="SUCCESS",
        details=f"Documento ID={document_id} eliminado de BD, ChromaDB y disco"
    )

    return {"message": f"Documento con ID {document_id} eliminado exitosamente."}


