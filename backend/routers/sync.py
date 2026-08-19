import os
from typing import List, Dict
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.document import Document
from backend.utils.hashing import calcular_hash
from backend.services.documents import procesar_documento
from backend.services.rag import RAGService
from backend.schemas.document import SyncSummaryResponse, SyncFileDetail

router = APIRouter()

DOCUMENTS_DIR = "./documents"

rag_service = RAGService()


def _asegurar_directorio():
    """Crea el directorio ./documents si no existe."""
    if not os.path.exists(DOCUMENTS_DIR):
        os.makedirs(DOCUMENTS_DIR, exist_ok=True)


@router.post("/sync", response_model=SyncSummaryResponse, status_code=status.HTTP_200_OK)
def sync_documents(db: Session = Depends(get_db)):
    """
    Sincroniza los documentos en la carpeta física ./documents/ con la base de datos SQLite:
    - Escanea archivos .pdf, .docx, .html y .htm.
    - Calcula el hash SHA-256 de cada uno.
    - Identifica archivos nuevos (added), modificados (updated) y sin cambios (unchanged).
    - Procesa únicamente los archivos nuevos y modificados.
    - Devuelve un resumen detallado con contadores y listas de archivos.
    """
    _asegurar_directorio()

    added: List[str] = []
    updated: List[str] = []
    unchanged: List[str] = []
    errors: List[str] = []
    details: List[SyncFileDetail] = []

    # Mapa de documentos existentes en la BD indexados por nombre original
    docs_existentes: Dict[str, Document] = {
        d.name: d for d in db.query(Document).filter(Document.status != "deleted").all()
    }

    archivos_fisicos = [
        f for f in os.listdir(DOCUMENTS_DIR)
        if os.path.isfile(os.path.join(DOCUMENTS_DIR, f)) and f.lower().endswith((".pdf", ".docx", ".html", ".htm"))
    ]

    for filename in archivos_fisicos:
        file_path = os.path.join(DOCUMENTS_DIR, filename)

        try:
            current_hash = calcular_hash(file_path)
            doc_bd = docs_existentes.get(filename)

            if doc_bd is None:
                # Archivo nuevo no registrado previamente en la BD
                resultado = procesar_documento(
                    ruta_archivo=file_path,
                    nombre_original=filename,
                    db=db
                )
                if resultado["chunks"]:
                    rag_service.indexar_documento(resultado["chunks"])
                added.append(filename)
                details.append(SyncFileDetail(
                    filename=filename,
                    hash=current_hash,
                    status="added",
                    message="Nuevo documento procesado e ingresado a la BD"
                ))

            elif doc_bd.hash != current_hash:
                # El contenido cambió (hash SHA-256 diferente)
                # Eliminar chunks antiguos de ChromaDB
                rag_service.eliminar_documento(doc_bd.id)
                resultado = procesar_documento(
                    ruta_archivo=file_path,
                    nombre_original=filename,
                    db=db
                )
                if resultado["chunks"]:
                    rag_service.indexar_documento(resultado["chunks"])
                updated.append(filename)
                details.append(SyncFileDetail(
                    filename=filename,
                    hash=current_hash,
                    status="updated",
                    message="Documento actualizado por cambio de contenido (SHA-256)"
                ))

            else:
                # El archivo existe y su hash coincide exactamente
                unchanged.append(filename)
                details.append(SyncFileDetail(
                    filename=filename,
                    hash=current_hash,
                    status="unchanged",
                    message="Documento sin cambios detectados"
                ))

        except Exception as e:
            errors.append(f"{filename}: {str(e)}")
            details.append(SyncFileDetail(
                filename=filename,
                hash="",
                status="error",
                message=f"Error en procesamiento: {str(e)}"
            ))

    total_processed = len(added) + len(updated) + len(unchanged)

    return SyncSummaryResponse(
        added=added,
        updated=updated,
        unchanged=unchanged,
        errors=errors,
        total_processed=total_processed,
        details=details
    )
