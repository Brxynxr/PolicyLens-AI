import re
from typing import List, Dict, Any, Optional
from backend.utils.text_cleaner import nombre_documento_legible

# Oraciones terminan estrictamente en . ! ? seguidas de espacio o fin de texto (se excluyen dos puntos)
_RE_ORACION = re.compile(r'[^.!?]+[.!?]+')

# Encabezados normativos que delimitan artículos, capítulos, cláusulas, títulos o parágrafos
_RE_NORMATIVO = re.compile(
    r"\n(?=(?:ART[IÍ]CULO|ART\.|CAP[IÍ]TULO|CAP\.|CL[AÁ]USULA|CL\.|SECCI[OÓ]N|SECC\.|T[IÍ]TULO|T[IÍ]T\.|NUMERAL|PAR[AÁ]GRAFO|PAR\.)\b)",
    re.IGNORECASE
)


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


def dividir_texto(texto: str, tamano_chunk: int = 1800, overlap: int = 350) -> List[str]:
    """
    Chunking Semántico / Header-Aware:

    1. Preserva bloques por saltos de línea doble ('\\n\\n') y encabezados normativos (Artículos, Capítulos, etc.).
    2. Asegura continuidad en artículos legales, cláusulas y numerales completos sin romperlos a mitad de frase.
    3. Tamaño de chunk optimizado: tamano_chunk=1800, overlap=350 (~20%).
    """

    if not texto or not texto.strip():
        return []

    texto_limpio = texto.strip()
    if len(texto_limpio) <= tamano_chunk:
        return [texto_limpio]

    if overlap >= tamano_chunk:
        overlap = max(0, tamano_chunk // 3)

    # 1. Fragmentación inicial por párrafos o títulos con salto doble
    parrafos_crudos = [p.strip() for p in re.split(r'\n\s*\n', texto_limpio) if p.strip()]

    # 2. Subdivisión por encabezados normativos (Artículos, Capítulos, etc.) si un bloque los agrupa
    bloques_estructurales: List[str] = []
    for parrafo in parrafos_crudos:
        sub_bloques = [b.strip() for b in _RE_NORMATIVO.split(parrafo) if b.strip()]
        if sub_bloques:
            bloques_estructurales.extend(sub_bloques)
        else:
            bloques_estructurales.append(parrafo)

    unidades: List[str] = []
    for bloque in bloques_estructurales:
        if len(bloque) <= tamano_chunk:
            unidades.append(bloque)
        else:
            unidades.extend(_dividir_por_oraciones(bloque, tamano_chunk))

    if not unidades:
        return [texto_limpio]

    def _longitud(partes: List[str]) -> int:
        return sum(len(p) for p in partes) + 2 * (len(partes) - 1) if partes else 0

    # 3. Construcción de Chunks con Overlap Flexible
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
    """
    Asigna metadatos estructurados e inyecta la cabecera contextual
    en el cuerpo del texto para vectorización de alta precisión (Contextual Chunking).
    """
    chunks_con_metadata: List[Dict[str, Any]] = []
    doc_legible = nombre_documento_legible(document_name)
    pag_num = page if page is not None else 1
    sec_val = (section or "").strip()
    if sec_val.lower() in ("general", f"página {pag_num}", f"pagina {pag_num}"):
        sec_val = ""

    cabecera_items = [f"DOCUMENTO: {doc_legible}"]
    if sec_val:
        cabecera_items.append(f"SECCIÓN: {sec_val}")
    cabecera_items.append(f"PÁG: {pag_num}")

    cabecera = f"[{' | '.join(cabecera_items)}]\n"

    for idx, content in enumerate(chunks):
        texto_chunk = content.strip()
        # Inyectar cabecera contextual si no está presente
        if not texto_chunk.startswith("[DOCUMENTO:"):
            texto_con_contexto = f"{cabecera}{texto_chunk}"
        else:
            texto_con_contexto = texto_chunk

        chunks_con_metadata.append({
            "document_id": document_id,
            "document_name": document_name,
            "page": pag_num,
            "section": section if section else "General",
            "chunk_index": chunk_offset + idx,
            "content": texto_con_contexto
        })

    return chunks_con_metadata

