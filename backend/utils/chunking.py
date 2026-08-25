import re
from typing import List, Dict, Any, Optional

# Oraciones terminan estrictamente en . ! ? seguidas de espacio o fin de texto (se excluyen dos puntos)
_RE_ORACION = re.compile(r'[^.!?]+[.!?]+')


def _dividir_por_oraciones(parrafo: str, tamano_chunk: int) -> List[str]:
    """
    Divide un párrafo largo en oraciones respetando puntos y signos de interrogación/exclamación.
    Si una oración excede tamano_chunk, se realiza corte por espacios.
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

        # Corte de emergencia por palabra si la oración supera el límite
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


def dividir_texto(texto: str, tamano_chunk: int = 800, overlap: int = 160) -> List[str]:
    """
    Chunking Semántico / Header-Aware:

    1. Preserva bloques por saltos de línea doble ('\\n\\n').
    2. Modifica el solapamiento para asegurar continuidad en reglas de negocio y títulos.
    3. Ajustados valores por defecto: tamano_chunk=800, overlap=160 (20%).
    """
    if not texto or not texto.strip():
        return []

    texto_limpio = texto.strip()
    if len(texto_limpio) <= tamano_chunk:
        return [texto_limpio]

    if overlap >= tamano_chunk:
        overlap = max(0, tamano_chunk // 3)

    # 1. Fragmentación inicial por párrafos o títulos con salto doble
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

    # 2. Construcción de Chunks con Overlap Flexible
    chunks: List[str] = []
    actuales: List[str] = []

    for unidad in unidades:
        candidatas = actuales + [unidad]
        if _longitud(candidatas) <= tamano_chunk:
            actuales = candidatas
            continue

        if actuales:
            chunks.append("\n\n".join(actuales))

            # Arrastre del overlap: toma unidades previas o aplica un corte de caracteres si la unidad es extensa
            cola: List[str] = []
            for previa in reversed(actuales):
                if _longitud([previa]) + _longitud(cola) <= overlap:
                    cola.insert(0, previa)
                else:
                    # Si no cabe entera pero no hay nada en la cola, fuerza el arrastre parcial del final
                    if not cola:
                        corte_parcial = previa[-overlap:].strip()
                        if corte_parcial:
                            cola.insert(0, corte_parcial)
                    break

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
    """ Asigna metadatos estructurados a los chunks generados. """
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
