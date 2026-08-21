import os
from typing import Dict, Any, List

from backend.database import SessionLocal
from backend.models.document import Document
from backend.services.documents import procesar_documento
from backend.services.rag import RAGService

DOCUMENTS_DIR = "./documents"
EXTENSIONES_PERMITIDAS = (".pdf", ".docx", ".html", ".htm")


def reindexar_todo(base_dir: str = DOCUMENTS_DIR) -> Dict[str, Any]:
    """
    Fuerza la reindexacion completa del sistema RAG:

    1. Vacia la coleccion de ChromaDB (elimina y recrea 'documents').
    2. Borra todos los registros de la tabla documents en SQLite.
    3. Reprocesa cada archivo fisico en ./documents con la configuracion
       vigente de chunking (utils/chunking.py) y embeddings.

    Util tras cambiar tamano_chunk/overlap o el modelo de embeddings,
    porque el sync incremental nunca reindexa archivos cuyo hash no cambio.

    :return: dict con resumen {archivos_procesados, total_chunks, errores, chunks_antes}.
    """
    db = SessionLocal()
    rag = RAGService()
    resumen: Dict[str, Any] = {
        "chunks_antes": 0,
        "archivos_procesados": [],
        "total_chunks": 0,
        "errores": [],
    }

    try:
        # 1. Reset completo de la coleccion vectorial
        try:
            resumen["chunks_antes"] = rag.collection.count()
        except Exception:
            pass
        rag._reset_coleccion()

        # 2. Limpieza total de metadatos en SQLite
        eliminados = db.query(Document).delete()
        db.commit()
        resumen["registros_eliminados_sqlite"] = eliminados

        # 3. Reprocesamiento fisico con el chunking actual
        for filename in sorted(os.listdir(base_dir)):
            ruta = os.path.join(base_dir, filename)
            if not os.path.isfile(ruta):
                continue
            if not filename.lower().endswith(EXTENSIONES_PERMITIDAS):
                continue

            try:
                resultado = procesar_documento(
                    ruta_archivo=ruta,
                    nombre_original=filename,
                    db=db
                )
                chunks: List[Dict[str, Any]] = resultado["chunks"]
                if chunks:
                    rag.indexar_documento(chunks)
                resumen["archivos_procesados"].append({
                    "archivo": filename,
                    "chunks": len(chunks)
                })
                resumen["total_chunks"] += len(chunks)
            except Exception as e:
                resumen["errores"].append(f"{filename}: {e}")
    finally:
        db.close()

    return resumen


if __name__ == "__main__":
    resultado = reindexar_todo()
    print(f"Chunks antes         : {resultado['chunks_antes']}")
    print(f"Registros SQLite borrados: {resultado.get('registros_eliminados_sqlite', 0)}")
    print(f"Archivos reprocesados : {len(resultado['archivos_procesados'])}")
    for item in resultado["archivos_procesados"]:
        print(f"  - {item['archivo']}: {item['chunks']} chunks")
    print(f"Total chunks nuevos   : {resultado['total_chunks']}")
    if resultado["errores"]:
        print("Errores:")
        for err in resultado["errores"]:
            print(f"  ! {err}")
