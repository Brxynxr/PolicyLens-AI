import os
from typing import List, Dict, Any
import docx


def extraer_texto_docx(ruta_archivo: str) -> List[Dict[str, Any]]:
    """
    Extrae el texto completo de un archivo DOCX utilizando python-docx.

    :param ruta_archivo: Ruta al archivo DOCX.
    :return: Lista de diccionarios con la estructura [{"page": 1, "text": texto_completo}].
    :raises FileNotFoundError: Si el archivo no existe.
    :raises ValueError: Si el archivo no es un documento DOCX válido o está corrupto.
    """
    if not os.path.exists(ruta_archivo):
        raise FileNotFoundError(f"El archivo DOCX no existe: {ruta_archivo}")

    try:
        doc = docx.Document(ruta_archivo)
        parrafos = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        texto_completo = "\n\n".join(parrafos)

        return [{
            "page": 1,
            "text": texto_completo
        }]
    except Exception as e:
        if isinstance(e, FileNotFoundError):
            raise
        raise ValueError(f"Error al procesar el archivo DOCX '{ruta_archivo}': {str(e)}")
