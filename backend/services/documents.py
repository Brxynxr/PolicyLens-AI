import os
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from backend.models.document import Document
from backend.utils.hashing import calcular_hash
from backend.utils.pdf import extraer_texto_pdf
from backend.utils.docx import extraer_texto_docx
from backend.utils.html import extraer_texto_html
from backend.utils.chunking import dividir_texto, crear_chunks_con_metadata


def guardar_documento(
    db: Session,
    nombre: str,
    original_name: str,
    tipo: str,
    hash_val: str,
    size: int,
    status: str = "processed"
) -> Document:
    """
    Crea o actualiza un registro de documento en la base de datos SQLite.
    Prioriza la búsqueda por nombre de archivo para actualizar registros existentes
    y evitar la duplicación de filas en SQLite al modificar contenido.
    """
    # 1. Buscar si ya existe un documento activo con el mismo nombre de archivo
    docs_mismo_nombre = db.query(Document).filter(
        Document.name == nombre,
        Document.status != "deleted"
    ).order_by(Document.id.asc()).all()

    if docs_mismo_nombre:
        doc_principal = docs_mismo_nombre[0]
        doc_principal.original_name = original_name
        doc_principal.type = tipo
        doc_principal.hash = hash_val
        doc_principal.size = size
        doc_principal.status = status
        doc_principal.upload_date = datetime.now(timezone.utc)

        # Eliminar cualquier registro duplicado obsoleto con el mismo nombre
        if len(docs_mismo_nombre) > 1:
            for doc_duplicado in docs_mismo_nombre[1:]:
                db.delete(doc_duplicado)

        db.commit()
        db.refresh(doc_principal)
        return doc_principal

    # 2. Si no coincide por nombre, verificar si existe por hash SHA-256
    doc_mismo_hash = db.query(Document).filter(
        Document.hash == hash_val,
        Document.status != "deleted"
    ).first()
    if doc_mismo_hash:
        doc_mismo_hash.name = nombre
        doc_mismo_hash.original_name = original_name
        doc_mismo_hash.type = tipo
        doc_mismo_hash.size = size
        doc_mismo_hash.status = status
        doc_mismo_hash.upload_date = datetime.now(timezone.utc)
        db.commit()
        db.refresh(doc_mismo_hash)
        return doc_mismo_hash

    # 3. Si no existe previamente, crear una nueva entrada
    nuevo_doc = Document(
        name=nombre,
        original_name=original_name,
        type=tipo,
        hash=hash_val,
        size=size,
        status=status,
        upload_date=datetime.now(timezone.utc)
    )
    db.add(nuevo_doc)
    db.commit()
    db.refresh(nuevo_doc)
    return nuevo_doc


def listar_documentos(db: Session) -> List[Document]:
    """
    Obtiene la lista completa de documentos registrados en la base de datos.
    """
    return db.query(Document).filter(Document.status != "deleted").order_by(Document.id.desc()).all()


def obtener_documento(db: Session, documento_id: int) -> Optional[Document]:
    """
    Obtiene un documento por su ID primario.
    """
    return db.query(Document).filter(Document.id == documento_id, Document.status != "deleted").first()


def eliminar_documento(db: Session, documento_id: int, base_dir: str = "./documents") -> bool:
    """
    Elimina el registro de un documento en la BD y elimina su archivo físico si existe.
    """
    doc = obtener_documento(db, documento_id)
    if not doc:
        return False

    ruta_archivo = os.path.join(base_dir, doc.name)
    if os.path.exists(ruta_archivo):
        try:
            os.remove(ruta_archivo)
        except OSError:
            pass

    db.delete(doc)
    db.commit()
    return True


def procesar_documento(
    ruta_archivo: str,
    nombre_original: str,
    db: Session
) -> Dict[str, Any]:
    """
    Orquesta el flujo completo de procesamiento de un documento (.pdf, .docx, .html, .htm):
    1. Detecta tipo (.pdf, .docx, .html, .htm)
    2. Extrae el texto por páginas, párrafos o secciones HTML
    3. Calcula el hash SHA-256
    4. Fragmenta el texto en chunks con metadatos
    5. Guarda/actualiza el registro en SQLite
    6. Retorna dict con el documento ORM y la lista de chunks con metadata
    """
    if not os.path.exists(ruta_archivo):
        raise FileNotFoundError(f"Archivo no encontrado: {ruta_archivo}")

    nombre_archivo = os.path.basename(ruta_archivo)
    extension = os.path.splitext(nombre_archivo)[1].lower()

    if extension == ".pdf":
        tipo = "pdf"
        paginas = extraer_texto_pdf(ruta_archivo)
    elif extension == ".docx":
        tipo = "docx"
        paginas = extraer_texto_docx(ruta_archivo)
    elif extension in [".html", ".htm"]:
        tipo = "html"
        paginas = extraer_texto_html(ruta_archivo)
    else:
        raise ValueError(f"Formato no soportado: {extension}. Solo se permiten archivos .pdf, .docx, .html y .htm")

    # Calcular hash SHA-256 y tamaño
    hash_val = calcular_hash(ruta_archivo)
    size = os.path.getsize(ruta_archivo)

    # Registrar en SQLite
    doc_orm = guardar_documento(
        db=db,
        nombre=nombre_archivo,
        original_name=nombre_original,
        tipo=tipo,
        hash_val=hash_val,
        size=size,
        status="processed"
    )

    # Generar chunks con metadatos para ChromaDB / RAG
    todos_los_chunks: List[Dict[str, Any]] = []
    chunk_offset = 0
    for pag in paginas:
        num_pagina = pag.get("page", 1)
        texto_pagina = pag.get("text", "")
        if not texto_pagina:
            continue

        raw_chunks = dividir_texto(texto_pagina, tamano_chunk=1500, overlap=200)
        chunks_con_meta = crear_chunks_con_metadata(
            document_id=doc_orm.id,
            document_name=doc_orm.name,
            page=num_pagina,
            section=f"Página {num_pagina}",
            chunks=raw_chunks,
            chunk_offset=chunk_offset
        )
        chunk_offset += len(raw_chunks)
        todos_los_chunks.extend(chunks_con_meta)

    return {
        "document": doc_orm,
        "chunks": todos_los_chunks
    }
