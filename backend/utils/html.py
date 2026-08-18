import os
from html.parser import HTMLParser
from typing import List, Dict, Any


class HTMLTextExtractor(HTMLParser):
    """
    Parser HTML basado en html.parser.HTMLParser que filtra etiquetas invisibles
    (script, style, head, meta) y formatea el texto conservando párrafos y encabezados.
    """

    def __init__(self):
        super().__init__()
        self.result: List[str] = []
        self.skip: bool = False

    def handle_starttag(self, tag: str, attrs: List[tuple]):
        tag_lower = tag.lower()
        if tag_lower in ["script", "style", "head", "meta", "title", "noscript"]:
            self.skip = True

    def handle_endtag(self, tag: str):
        tag_lower = tag.lower()
        if tag_lower in ["script", "style", "head", "meta", "title", "noscript"]:
            self.skip = False
        elif tag_lower in ["p", "h1", "h2", "h3", "h4", "h5", "h6", "div", "li", "tr", "br", "article", "section"]:
            self.result.append("\n")

    def handle_data(self, data: str):
        if not self.skip and data.strip():
            self.result.append(data.strip() + " ")

    def get_text(self) -> str:
        raw_text = "".join(self.result)
        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
        return "\n\n".join(lines)


def extraer_texto_html(ruta_archivo: str) -> List[Dict[str, Any]]:
    """
    Extrae el texto de un archivo HTML (.html o .htm).

    :param ruta_archivo: Ruta al archivo HTML.
    :return: Lista de diccionarios con la estructura [{"page": 1, "text": texto_limpio}].
    :raises FileNotFoundError: Si el archivo no existe.
    :raises ValueError: Si ocurre un error durante el procesamiento.
    """
    if not os.path.exists(ruta_archivo):
        raise FileNotFoundError(f"El archivo HTML no existe: {ruta_archivo}")

    try:
        # Intentar leer en UTF-8 con fallback a latin-1
        try:
            with open(ruta_archivo, "r", encoding="utf-8") as f:
                content = f.read()
        except UnicodeDecodeError:
            with open(ruta_archivo, "r", encoding="latin-1", errors="ignore") as f:
                content = f.read()

        parser = HTMLTextExtractor()
        parser.feed(content)
        texto_limpio = parser.get_text()

        return [{
            "page": 1,
            "text": texto_limpio
        }]
    except Exception as e:
        if isinstance(e, FileNotFoundError):
            raise
        raise ValueError(f"Error al procesar el archivo HTML '{ruta_archivo}': {str(e)}")
