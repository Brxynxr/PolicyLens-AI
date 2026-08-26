import os
import re
import unicodedata
from typing import Dict, Optional

ACRONIMOS_DOC = {"rrhh", "nda", "ia", "rh", "afp", "eps", "arl", "ssi"}
PALABRAS_ESTRUCTURALES = ("seccion", "articulo", "clausula", "pagina", "capitulo", "anexo", "paragrafo")


def sin_tildes(texto: Optional[str]) -> str:
    """
    Elimina diacríticos y acentos: 'año'->'ano', 'días'->'dias', 'política'->'politica'.
    Permite comparaciones y matching léxico insensible a acentos.
    """
    if not texto:
        return ""
    return ''.join(c for c in unicodedata.normalize('NFD', str(texto)) if unicodedata.category(c) != 'Mn')


def nombre_documento_legible(nombre_archivo: Optional[str]) -> str:
    """
    Convierte 'manual_rrhh_2026.pdf' en 'Manual RRHH 2026'.
    """
    if not nombre_archivo:
        return "Documento Corporativo"
    base = os.path.splitext(os.path.basename(str(nombre_archivo)))[0]
    base = re.sub(r"[_\-]+", " ", base).strip()
    palabras = []
    for p in base.split():
        if p and p.lower() in ACRONIMOS_DOC:
            palabras.append(p.upper())
        elif p and p.islower():
            palabras.append(p.capitalize())
        elif p:
            palabras.append(p)
    return " ".join(palabras) or str(nombre_archivo)


def formatear_cita(document_name: Optional[str], page: Optional[int] = None, section: Optional[str] = None) -> str:
    """
    Formatea una cita formal corporativa.
    Ejemplo: 'Manual RRHH 2026 — Sección Teletrabajo (Pág. 3)'.
    Omite la sección cuando es redundante ('Página N' / 'General').
    """
    cita = nombre_documento_legible(document_name)

    sec = (section or "").strip()
    sec_norm = sin_tildes(sec).lower() if sec else ""
    pag_str = sin_tildes(f"pagina {page}").lower() if page is not None else ""
    redundante = not sec or sec_norm == "general" or (pag_str and sec_norm == pag_str)
    if not redundante:
        partes = re.split(r"[\s:.]+", sec_norm)
        primera_palabra = partes[0] if partes else ""
        prefijo = "" if primera_palabra in PALABRAS_ESTRUCTURALES else "Sección "
        cita += f" — {prefijo}{sec}"

    if page:
        cita += f" (Pág. {page})"

    return cita


def limpiar_texto_pasaje(texto: Optional[str]) -> str:
    """
    Sanea y estructura un pasaje recuperado de la base vectorial:
    - Elimina encabezados Markdown (#, ##, ###) en cualquier posición y ruido técnico.
    - Normaliza comillas, guiones y caracteres residuales.
    - Separa apartados y cláusulas con saltos de línea claros.
    - Estructura viñetas y listas para lectura empresarial espaciada.
    """
    if not texto:
        return ""

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

    # --- Normalizar numerales de listas (ej: '1.\n\nTexto' -> '1. Texto') ---
    t = re.sub(r"(?<=[.:])\s*(\d{1,3}[\.\)])", r"\n\n\1", t)
    t = re.sub(r"(?m)^(\s*\d{1,3}[\.\)])\s*\n+", r"\1 ", t)

    # --- Marcadores de énfasis residuales aislados ---
    t = re.sub(r"(?<!\*)\*{1,3}(?!\*)", "", t)

    # --- Normalizar saltos de línea dentro de párrafos narrativos ---
    t = re.sub(r"[ \t]+", " ", t)
    bloques = [b.strip() for b in re.split(r"\n{2,}", t) if b.strip()]
    bloques_unidos = []
    for b in bloques:
        lineas = [l.strip() for l in b.split("\n") if l.strip()]
        if len(lineas) > 1 and not any(l.startswith(("•", "-", "*")) for l in lineas):
            bloques_unidos.append(" ".join(lineas))
        else:
            bloques_unidos.append("\n".join(lineas))

    t = "\n\n".join(bloques_unidos).strip()
    return t
