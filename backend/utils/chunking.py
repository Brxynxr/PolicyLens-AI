import re
from typing import List, Dict, Any, Optional


# Oraciones terminan en . ! ? : ; seguidas de espacio o fin de texto
_RE_ORACION = re.compile(r'[^.!?;:]+[.!?;:]+')


def _dividir_por_oraciones(parrafo: str, tamano_chunk: int) -> List[str]:
    """
    Divide un parrafo largo en oraciones. Si una oracion individual excede
    tamano_chunk, se corta por espacios (nunca a mitad de palabra).
    """
    partes = [m.group(0).strip() for m in _RE_ORACION.finditer(parrafo)]
    resto = _RE_ORACION.sub('', parrafo).strip()
    if resto:
        partes.append(resto)

    unidades: List[str] = []
    for parte in partes:
        if not parte:
            continue
        if len(parte) <= tamano_chunk:
            unidades.append(parte)
            continue

        # Ultimo recurso: oracion gigante sin puntuacion -> corte por espacios
        inicio = 0
        longitud = len(parte)
        while inicio < longitud:
            fin = min(inicio + tamano_chunk, longitud)
            if fin < longitud:
                espacio = parte.rfind(' ', inicio, fin)
                if espacio > inicio:
                    fin = espacio
            fragmento = parte[inicio:fin].strip()
            if fragmento:
                unidades.append(fragmento)
            inicio = fin
    return unidades


def dividir_texto(texto: str, tamano_chunk: int = 1500, overlap: int = 200) -> List[str]:
    """
    Chunking semantico/recursivo:

    1. Divide el texto en parrafos por saltos de linea doble ('\\n\\n').
    2. Los parrafos que exceden tamano_chunk se subdividen por oraciones.
    3. Las oraciones gigantes sin puntuacion se cortan por espacios.
    4. Fusiona unidades respetando tamano_chunk y agrega solapamiento (overlap)
       arrastrando las ultimas unidades completas del chunk anterior, de modo
       que las oraciones/condiciones nunca quedan cortadas a la mitad.

    :param texto: Texto de entrada.
    :param tamano_chunk: Tamano maximo de caracteres por chunk (~512 tokens).
    :param overlap: Caracteres maximos de solapamiento entre chunks consecutivos
                    (10-15% de tamano_chunk recomendado).
    :return: Lista de cadenas de texto (chunks).
    """
    if not texto or not texto.strip():
        return []

    texto_limpio = texto.strip()
    if len(texto_limpio) <= tamano_chunk:
        return [texto_limpio]

    if overlap >= tamano_chunk:
        overlap = max(0, tamano_chunk // 3)

    # 1-3. Construir unidades atomicas (parrafos u oraciones completas)
    parrafos = [p.strip() for p in re.split(r'\n\s*\n', texto_limpio) if p.strip()]
    unidades: List[str] = []
    for parrafo in parrafos:
        if len(parrafo) <= tamano_chunk:
            unidades.append(parrafo)
        else:
            unidades.extend(_dividir_por_oraciones(parrafo, tamano_chunk))

    if not unidades:
        return [texto_limpio]

    def _longitud(partes: List[str]) -> int:
        return sum(len(p) for p in partes) + 2 * (len(partes) - 1) if partes else 0

    # 4. Fusion con overlap semantico
    chunks: List[str] = []
    actuales: List[str] = []

    for unidad in unidades:
        candidatas = actuales + [unidad]
        if _longitud(candidatas) <= tamano_chunk:
            actuales = candidatas
            continue

        # Cerrar el chunk actual
        if actuales:
            chunks.append("\n\n".join(actuales))

            # Overlap: arrastrar unidades completas del final (<= overlap chars)
            cola: List[str] = []
            for previa in reversed(actuales):
                if _longitud([previa]) + _longitud(cola) <= overlap:
                    cola.insert(0, previa)
                else:
                    break

            # Solo mantener la cola si deja espacio para la nueva unidad
            if _longitud(cola + [unidad]) <= tamano_chunk:
                actuales = cola + [unidad]
            else:
                actuales = [unidad]
        else:
            actuales = [unidad]

    if actuales:
        chunks.append("\n\n".join(actuales))

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
