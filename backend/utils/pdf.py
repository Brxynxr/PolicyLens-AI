import os
from typing import List, Dict, Any
import fitz  # PyMuPDF


def extraer_texto_pdf(ruta_archivo: str) -> List[Dict[str, Any]]:
    """
    Extrae el texto de un archivo PDF página por página utilizando PyMuPDF (fitz).

    :param ruta_archivo: Ruta al archivo PDF.
    :return: Lista de diccionarios con la estructura [{"page": numero_pagina, "text": texto_pagina}].
             Las páginas son 1-indexed.
    :raises FileNotFoundError: Si el archivo no existe.
    :raises ValueError: Si el archivo está corrupto o no se puede procesar como PDF.
    """
    if not os.path.exists(ruta_archivo):
        raise FileNotFoundError(f"El archivo PDF no existe: {ruta_archivo}")

    paginas_extraidas: List[Dict[str, Any]] = []

    try:
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
    except Exception as e:
        if isinstance(e, FileNotFoundError) or isinstance(e, ValueError):
            raise
        raise ValueError(f"Error al procesar o extraer texto del archivo PDF '{ruta_archivo}': {str(e)}")

    return paginas_extraidas
