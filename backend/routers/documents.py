import os
import shutil
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas.document import DocumentResponse, DocumentListResponse
from backend.services.documents import (
    listar_documentos,
    obtener_documento,
    eliminar_documento,
    procesar_documento,
)

router = APIRouter()

DOCUMENTS_DIR = "./documents"


def _asegurar_directorio():
    """Crea el directorio ./documents si no existe."""
    if not os.path.exists(DOCUMENTS_DIR):
        os.makedirs(DOCUMENTS_DIR, exist_ok=True)


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
def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Subir un documento (.pdf, .docx, .html, .htm), guardarlo físicamente en ./documents/,
    extraer su texto, fragmentarlo en chunks con metadatos y registrarlo en SQLite.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nombre de archivo inválido."
        )

    extension = os.path.splitext(file.filename)[1].lower()
    if extension not in [".pdf", ".docx", ".html", ".htm"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato no permitido: '{extension}'. Solo se permiten archivos .pdf, .docx, .html y .htm"
        )

    _asegurar_directorio()
    file_path = os.path.join(DOCUMENTS_DIR, file.filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        res = procesar_documento(
            ruta_archivo=file_path,
            nombre_original=file.filename,
            db=db
        )
        return DocumentResponse.model_validate(res["document"])
    except ValueError as ve:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al procesar archivo: {str(e)}")


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
def delete_document_by_id(document_id: int, db: Session = Depends(get_db)):
    """
    Eliminar un documento por su ID (elimina el registro de la BD y el archivo físico).
    """
    exito = eliminar_documento(db, document_id, base_dir=DOCUMENTS_DIR)
    if not exito:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Documento con ID {document_id} no encontrado para eliminar."
        )
    return {"message": f"Documento con ID {document_id} eliminado exitosamente."}
