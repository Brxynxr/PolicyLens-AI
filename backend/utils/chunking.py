from typing import List, Dict, Any, Optional


def dividir_texto(texto: str, tamano_chunk: int = 500, overlap: int = 50) -> List[str]:
    """
    Divide un texto en fragmentos (chunks) usando una ventana deslizante con solapamiento (overlap).

    :param texto: Texto de entrada.
    :param tamano_chunk: Tamaño máximo de caracteres por chunk.
    :param overlap: Número de caracteres de solapamiento entre chunks consecutivos.
    :return: Lista de cadenas de texto (chunks).
    """
    if not texto or not texto.strip():
        return []

    texto_limpio = texto.strip()
    longitud = len(texto_limpio)

    if longitud <= tamano_chunk:
        return [texto_limpio]

    # Prevenir casos donde overlap es mayor o igual a tamano_chunk (lo que causaría bucle infinito)
    if overlap >= tamano_chunk:
        overlap = max(0, tamano_chunk - 1)

    step = tamano_chunk - overlap
    chunks: List[str] = []
    inicio = 0

    while inicio < longitud:
        fin = inicio + tamano_chunk
        chunk = texto_limpio[inicio:fin]
        if chunk:
            chunks.append(chunk)
        inicio += step

    return chunks


def crear_chunks_con_metadata(
    document_id: int,
    document_name: str,
    page: Optional[int],
    section: Optional[str],
    chunks: List[str],
    chunk_offset: int = 0
) -> List[Dict[str, Any]]:
    """
    Asigna metadatos estructurados a cada chunk de texto.

    :param document_id: ID del documento en SQLite.
    :param document_name: Nombre asignado/almacenado del documento.
    :param page: Número de página (1-indexed) o None.
    :param section: Nombre o título de la sección si existe.
    :param chunks: Lista de fragmentos de texto devueltos por `dividir_texto`.
    :param chunk_offset: Índice base para numerar los chunks (para evitar duplicados entre páginas).
    :return: Lista de diccionarios con la estructura requerida por ChromaDB y el flujo RAG.
    """
    chunks_con_metadata: List[Dict[str, Any]] = []

    for idx, content in enumerate(chunks):
        chunks_con_metadata.append({
            "document_id": document_id,
            "document_name": document_name,
            "page": page if page is not None else 1,
            "section": section if section else "General",
            "chunk_index": chunk_offset + idx,
            "content": content
        })

    return chunks_con_metadata
