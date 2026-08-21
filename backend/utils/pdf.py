import os
from typing import List, Dict, Any
import fitz  # PyMuPDF

try:
    import pymupdf4llm
    PYMUPDF4LLM_DISPONIBLE = True
except ImportError:
    PYMUPDF4LLM_DISPONIBLE = False


def _extraer_texto_pdf_markdown(ruta_archivo: str) -> List[Dict[str, Any]]:
    """
    Extraccion en Markdown estructurado con pymupdf4llm.
    Conserva encabezados (#, ##), listas (-, *) y tablas en formato Markdown,
    lo que mejora la calidad contextual de los embeddings.
    """
    paginas_extraidas: List[Dict[str, Any]] = []

    # page_chunks=True retorna una lista ordenada de dicts, uno por pagina
    chunks_pagina = pymupdf4llm.to_markdown(ruta_archivo, page_chunks=True)

    for indice, chunk in enumerate(chunks_pagina):
        texto = (chunk.get("text") or "").strip()
        if not texto:
            continue
        paginas_extraidas.append({
            "page": indice + 1,  # 1-indexed, el orden de la lista sigue el orden del PDF
            "text": texto
        })

    return paginas_extraidas


def _extraer_texto_pdf_plano(ruta_archivo: str) -> List[Dict[str, Any]]:
    """
    Fallback: extraccion de texto plano pagina por pagina con PyMuPDF nativo.
    """
    paginas_extraidas: List[Dict[str, Any]] = []

    doc = fitz.open(ruta_archivo)
    if not doc.is_pdf and doc.page_count == 0:
        raise ValueError(f"El archivo no es un documento PDF válido o está vacío: {ruta_archivo}")

    for num_pagina in range(len(doc)):
        page = doc.load_page(num_pagina)
        text = page.get_text("text").strip()
        paginas_extraidas.append({
            "page": num_pagina + 1,  # 1-indexed
            "text": text
        })

    doc.close()
    return paginas_extraidas


def extraer_texto_pdf(ruta_archivo: str) -> List[Dict[str, Any]]:
    """
    Extrae el texto de un archivo PDF como Markdown estructurado utilizando pymupdf4llm.

    Conserva encabezados (#, ##), listas y tablas formateadas en Markdown para
    mejorar la calidad contextual de los embeddings. Si pymupdf4llm no esta
    disponible o falla, realiza fallback a la extraccion plana de PyMuPDF.

    :param ruta_archivo: Ruta al archivo PDF.
    :return: Lista de diccionarios con la estructura [{"page": numero_pagina, "text": texto_pagina}].
             Las páginas son 1-indexed.
    :raises FileNotFoundError: Si el archivo no existe.
    :raises ValueError: Si el archivo está corrupto o no se puede procesar como PDF.
    """
    if not os.path.exists(ruta_archivo):
        raise FileNotFoundError(f"El archivo PDF no existe: {ruta_archivo}")

    try:
        if PYMUPDF4LLM_DISPONIBLE:
            return _extraer_texto_pdf_markdown(ruta_archivo)
        return _extraer_texto_pdf_plano(ruta_archivo)
    except Exception as e:
        if isinstance(e, FileNotFoundError) or isinstance(e, ValueError):
            raise
        # Fallback a extraccion plana si el parseo Markdown falla
        try:
            return _extraer_texto_pdf_plano(ruta_archivo)
        except Exception as e2:
            raise ValueError(f"Error al procesar o extraer texto del archivo PDF '{ruta_archivo}': {str(e2)}")
