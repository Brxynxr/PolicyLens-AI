import os
import re
import unicodedata
from typing import Dict, Optional

ACRONIMOS_DOC = {"rrhh", "nda", "ia", "rh", "afp", "eps", "arl", "ssi"}
PALABRAS_ESTRUCTURALES = ("seccion", "articulo", "clausula", "pagina", "capitulo", "anexo", "paragrafo")


def sin_tildes(texto: str) -> str:
    """
    Elimina diacríticos y acentos: 'año'->'ano', 'días'->'dias', 'política'->'politica'.
    Permite comparaciones y matching léxico insensible a acentos.
    """
    return ''.join(c for c in unicodedata.normalize('NFD', texto) if unicodedata.category(c) != 'Mn')


def nombre_documento_legible(nombre_archivo: str) -> str:
    """
    Convierte 'manual_rrhh_2026.pdf' en 'Manual RRHH 2026'.
    """
    base = os.path.splitext(os.path.basename(nombre_archivo))[0]
    base = re.sub(r"[_\-]+", " ", base).strip()
    palabras = []
    for p in base.split():
        if p.lower() in ACRONIMOS_DOC:
            palabras.append(p.upper())
        elif p.islower():
            palabras.append(p.capitalize())
        else:
            palabras.append(p)
    return " ".join(palabras) or nombre_archivo


def formatear_cita(document_name: str, page: Optional[int] = None, section: Optional[str] = None) -> str:
    """
    Formatea una cita formal corporativa.
    Ejemplo: 'Manual RRHH 2026 — Sección Teletrabajo (Pág. 3)'.
    Omite la sección cuando es redundante ('Página N' / 'General').
    """
    cita = nombre_documento_legible(document_name)

    sec = (section or "").strip()
    sec_norm = sin_tildes(sec).lower()
    pag_str = sin_tildes(f"pagina {page}").lower()
    redundante = not sec or sec_norm == "general" or sec_norm == pag_str
    if not redundante:
        primera_palabra = re.split(r"[\s:.]+", sec_norm)[0]
        prefijo = "" if primera_palabra in PALABRAS_ESTRUCTURALES else "Sección "
        cita += f" — {prefijo}{sec}"

    if page:
        cita += f" (Pág. {page})"

    return cita


def limpiar_texto_pasaje(texto: str) -> str:
    """
    Sanea y estructura un pasaje recuperado de la base vectorial:
    - Elimina encabezados Markdown (#, ##, ###) en cualquier posición y ruido técnico.
    - Normaliza comillas, guiones y caracteres residuales.
    - Separa apartados y cláusulas con saltos de línea claros.
    - Estructura viñetas y listas para lectura empresarial espaciada.
    """
    if not texto:
        return texto

    t = texto

    # --- Ruido técnico y ligaduras ---
    t = t.replace("\xa0", " ")
    for lig, repl in (("ﬁ", "fi"), ("ﬂ", "fl"), ("ﬀ", "ff"), ("ﬃ", "ffi"), ("ﬄ", "ffl")):
        t = t.replace(lig, repl)
    t = re.sub(r"[\u200b\u200c\u200d\ufeff\u00ad]", "", t)

    # --- Comillas tipográficas y guiones ---
    t = t.translate(str.maketrans({
        "\u201c": '"', "\u201d": '"', "\u201e": '"', "\u00ab": '"', "\u00bb": '"',
        "\u2018": "'", "\u2019": "'", "\u201a": "'",
        "\u2013": "-", "\u2212": "-",
    }))
    t = re.sub(r"[▪●◦‣·]", "•", t)

    # --- Eliminar encabezados Markdown (###, ##, #) en cualquier posición ---
    t = re.sub(r"#{1,6}\s*", "", t)

    # --- Separar títulos y subcláusulas pegadas con saltos de línea ---
    t = re.sub(r"(?<=[.:!?])\s*(\d+\.\d+(?:\.\d+)?\s+[A-ZÁÉÍÓÚÑ])", r"\n\n**\1", t)
    t = re.sub(r"(?<=[.:!?])\s*((?:SECCIÓN|ARTÍCULO|CLÁUSULA|CAPÍTULO)\s+\d+:?)", r"\n\n**\1**", t)

    # --- Proteger paréntesis: evita que '(Pág. 12)' se convierta en viñeta ---
    _parentesis: Dict[str, str] = {}
    def _guardar_parentesis(m: re.Match) -> str:
        clave = f"«P{len(_parentesis)}»"
        _parentesis[clave] = m.group(0)
        return clave
    t = re.sub(r"\([^)]{0,80}\)", _guardar_parentesis, t)

    # --- Viñetas de guiones, asteriscos o literales a) 1) ---
    t = re.sub(r"(?:^|\s+)[-*]\s+", "\n• ", t)
    t = re.sub(r"(?<![\w.\d])([a-z]|\d{1,2})\)\s+", "\n• ", t)

    # --- Restaurar paréntesis ---
    for clave, original in _parentesis.items():
        t = t.replace(clave, original)

    # --- Asegurar salto antes de cada viñeta ---
    t = re.sub(r"(?<!\n)\s*•\s*", "\n• ", t)

    # --- Marcadores de énfasis residuales aislados ---
    t = re.sub(r"(?<!\*)\*{1,3}(?!\*)", "", t)

    # --- Normalizar saltos triples a dobles y espacios por línea ---
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    t = "\n".join(linea.rstrip() for linea in t.split("\n")).strip()

    return t
