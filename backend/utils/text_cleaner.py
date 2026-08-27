import os
import re
import unicodedata
from typing import Dict, Optional

# Listas para retrocompatibilidad
ACRONIMOS_DOC = set()
PALABRAS_ESTRUCTURALES = ()


def sin_tildes(texto: Optional[str]) -> str:
    """
    Elimina diacríticos y acentos: 'año'->'ano', 'días'->'dias', 'política'->'politica'.
    Permite comparaciones y matching léxico insensible a acentos.
    """
    if not texto:
        return ""
    return ''.join(c for c in unicodedata.normalize('NFD', str(texto)) if unicodedata.category(c) != 'Mn')


ACRONIMOS_COMUNES = {"rrhh", "rh", "ti", "it", "nda", "sst", "sg-sst", "pol", "sc05", "afp", "eps", "arl", "ssi", "iso"}


def nombre_documento_legible(nombre_archivo: Optional[str]) -> str:
    """
    Convierte de forma dinámica cualquier nombre de archivo en un título legible.
    Separa camelCase, guiones y guiones bajos preservando acrónimos y mayúsculas.
    """
    if not nombre_archivo:
        return "Documento Corporativo"
    base = os.path.splitext(os.path.basename(str(nombre_archivo)))[0]
    base = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", base)
    base = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1 \2", base)
    base = re.sub(r"[_\-]+", " ", base).strip()

    palabras = []
    for p in base.split():
        if not p:
            continue
        lower_p = p.lower()
        if lower_p in ACRONIMOS_COMUNES or (len(p) > 1 and p.isupper()):
            palabras.append(p.upper())
        elif p.islower():
            palabras.append(p.capitalize())
        else:
            palabras.append(p)
    return " ".join(palabras) or str(nombre_archivo)


def formatear_cita(document_name: Optional[str], page: Optional[int] = None, section: Optional[str] = None) -> str:
    """
    Formatea dinámicamente una cita corporativa.
    Ejemplo: 'Manual RRHH 2026 — Sección Teletrabajo (Pág. 3)'.
    """
    cita = nombre_documento_legible(document_name)

    sec = (section or "").strip()
    sec_norm = sin_tildes(sec).lower() if sec else ""
    pag_str = sin_tildes(f"pagina {page}").lower() if page is not None else ""
    redundante = not sec or sec_norm == "general" or (pag_str and sec_norm == pag_str)
    if not redundante:
        prefijo = "" if any(sec_norm.startswith(p) for p in ["seccion", "sección", "articulo", "artículo", "clausula", "cláusula", "capitulo", "capítulo", "anexo", "paragrafo", "parágrafo"]) else "Sección "
        cita += f" — {prefijo}{sec}"

    if page:
        cita += f" (Pág. {page})"

    return cita



PATRONES_BOILERPLATE = [
    # Cabeceras de procesos de calidad y versiones
    r"(?i)Proceso:\s*Seguridad\s*y\s*Privacidad[^\n]*\n?",
    r"(?i)MANUAL\s*DE\s*POLITICAS\s*DE\s*SEGURIDAD\s*DIGITAL[^\n]*\n?",
    r"(?i)Versi[oó]n:\s*\d+\s*(?:SYPI\.[A-Z0-9\.]+|[A-Z0-9\._\-]+)?\s*Clasificaci[oó]n:\s*P[uú]blica\s*(?:\d+\s*de\s*\d+)?\n?",
    r"(?i)Clasificaci[oó]n:\s*P[uú]blica\s*\d+\s*de\s*\d+\n?",
    r"(?i)P[aá]gina\s*\d+\s*de\s*\d+\n?",
    # Encabezados institucionales y sedes
    r"(?i)REGLAMENTO\s*INTERNO\s*DE\s*TRABAJO[^\n]*\n?",
    r"(?i)CENTRO\s*DE\s*DIAGN[OÓ]STICO\s*AUTOMOTOR\s*DEL\s*VALLE\s*LTDA\.?\n?",
    r"(?i)Calle\s*\d+.*?(?:Cali|Colombia)[^\n]*\n?",
    r"(?i)Valle\s*del\s*Cauca,\s*Colombia\.?\n?",
    r"(?i)Sede\s*electr[oó]nica:\s*www\.[a-z0-9\.\-]+\.[a-z]{2,4}\.?\n?",
    r"(?i)Correo\s*electr[oó]nico:\s*[a-z0-9\._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,4}\.?\n?",
    r"(?i)PBX\s*(?:\d+[\s\(\)\-]*)?\d+\.?\n?",
    r"(?i)\)?\s*664\s*44\s*24\.?\n?",
]


def limpiar_boilerplate_institucional(texto: str) -> str:
    """
    Elimina encabezados de calidad, pies de página institucionales, datos de contacto
    y numeración de páginas que ensucian los pasajes extraídos del PDF.
    """
    if not texto:
        return ""
    t = texto
    for patron in PATRONES_BOILERPLATE:
        t = re.sub(patron, "", t)
    # Limpiar líneas vacías repetidas
    t = re.sub(r"\n{3,}", "\n\n", t).strip()
    return t


def resaltar_terminos_clave(texto: str, query: str) -> str:
    """
    Resalta en **negrita** los términos relevantes de la búsqueda de forma dinámica.
    """
    if not texto or not query:
        return texto

    # Extraer palabras informativas de la consulta de forma dinámica (palabras >= 4 letras)
    palabras_query = [
        p.lower() for p in re.findall(r'\b[a-zA-ZáéíóúÁÉÍÓÚñÑ]{4,}\b', query)
        if len(p) >= 4
    ]
    if not palabras_query:
        return texto

    resultado = texto
    for pal in set(palabras_query):
        patron = rf'(?i)\b({re.escape(pal)})\b(?![^*]*\*\*)'
        resultado = re.sub(patron, r'**\1**', resultado)

    resultado = re.sub(r'\*{4,}', '**', resultado)
    return resultado


def extraer_pasaje_conciso(texto: str, query: str, max_chars: int = 900) -> str:
    """
    Extrae dinámicamente los párrafos más relevantes respecto a la consulta usando coincidencia de términos.
    """
    if not texto or len(texto) <= max_chars:
        return texto

    bloques = [b.strip() for b in re.split(r'\n\s*\n', texto) if b.strip()]
    if len(bloques) <= 1:
        return texto[:max_chars].rsplit(" ", 1)[0] + "..." if len(texto) > max_chars else texto

    palabras_query = set(
        p.lower() for p in re.findall(r'\b[a-zA-ZáéíóúÁÉÍÓÚñÑ]{4,}\b', query)
        if len(p) >= 4
    )

    bloques_puntuados = []
    for b in bloques:
        b_lower = b.lower()
        score = sum(1 for p in palabras_query if p in b_lower)
        bloques_puntuados.append((score, b))

    bloques_puntuados.sort(key=lambda x: x[0], reverse=True)

    bloques_seleccionados = []
    total_len = 0
    for score, b in bloques_puntuados:
        if total_len + len(b) <= max_chars:
            bloques_seleccionados.append(b)
            total_len += len(b)
        else:
            break

    if not bloques_seleccionados:
        bloques_seleccionados = bloques[:2]

    return "\n\n".join(bloques_seleccionados)


def limpiar_texto_pasaje(texto: Optional[str]) -> str:

    """
    Sanea un pasaje de texto eliminando membretes y ruido de maquetación,
    conservando Markdown estándar puro para el frontend.
    """
    if not texto:
        return ""

    # 1. Limpiar membretes y datos de maquetación institucional
    t = limpiar_boilerplate_institucional(texto)

    # 2. Ruido técnico y ligaduras
    t = t.replace("\xa0", " ")
    for lig, repl in (("ﬁ", "fi"), ("ﬂ", "fl"), ("ﬀ", "ff"), ("ﬃ", "ffi"), ("ﬄ", "ffl")):
        t = t.replace(lig, repl)
    t = re.sub(r"[\u200b\u200c\u200d\ufeff\u00ad]", "", t)

    # 3. Comillas tipográficas
    t = t.translate(str.maketrans({
        "\u201c": '"', "\u201d": '"', "\u201e": '"', "\u00ab": '"', "\u00bb": '"',
        "\u2018": "'", "\u2019": "'", "\u201a": "'",
        "\u2013": "-", "\u2212": "-",
    }))

    # 4. Eliminar almohadillas sueltas de títulos crudos
    t = re.sub(r"#{1,6}\s*", "", t)

    # 5. Normalizar viñetas a guion estándar Markdown
    t = re.sub(r"[▪●◦‣·•]", "-", t)

    # 6. Normalizar espacios horizontales repetidos
    t = re.sub(r"[ \t]+", " ", t)

    # 7. Limpiar líneas vacías excesivas
    t = re.sub(r"\n{3,}", "\n\n", t).strip()


    return t


