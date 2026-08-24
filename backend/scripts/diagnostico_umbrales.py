"""
Diagnostico de umbrales del pipeline RAG con BAAI/bge-m3.

Ejecuta preguntas de prueba contra ChromaDB y muestra el Top-3 de chunks
por pregunta SIN aplicar ningun filtro de umbral, con los puntajes completos
(coseno, BM25, metadata boost e hibrido) para calibrar los umbrales de
backend/services/rag.py.

Uso (desde la raiz del proyecto):
    python -m backend.scripts.diagnostico_umbrales
"""

import os
import sys

# Cargar variables de entorno antes de importar los servicios
from dotenv import load_dotenv

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))

from rank_bm25 import BM25Okapi

from backend.services.rag import (
    RAGService,
    _tokenizar,
    STOPWORDS_ES,
    PESO_COSENO,
    PESO_BM25,
    METADATA_BOOST,
    UMBRAL_COS_RELEVANTE,
    UMBRAL_HIBRIDO_RELEVANTE,
    UMBRAL_COS_FALLBACK,
)

PREGUNTAS_PRUEBA = [
    ("P1", "¿Cuántos días de vacaciones tengo por año?"),
    ("P2", "¿De cuánto es el aumento salarial por desempeño excepcional?"),
    ("P3", "¿Hasta cuántos días a la semana puedo trabajar en remoto?"),
    ("P4", "¿Cuál es la capital de Francia?"),
]

TOP_K_CANDIDATOS = 12  # mismo pool que usa preguntar()
TOP_REPORTE = 3


def puntuar_sin_filtros(rag: RAGService, pregunta: str) -> list:
    """
    Replica el calculo de puntajes de RAGService.preguntar()
    pero NO filtra por umbrales ni deduplica: devuelve todo el pool ordenado.
    """
    fragmentos = rag.buscar_fragmentos(pregunta, top_k=TOP_K_CANDIDATOS)

    terminos_query = [
        w for w in _tokenizar(pregunta)
        if w not in STOPWORDS_ES and len(w) > 2
    ]

    bm25_scores = [0.0] * len(fragmentos)
    if terminos_query and fragmentos:
        corpus = [_tokenizar(frag["content"]) for frag in fragmentos]
        bm25 = BM25Okapi(corpus)
        scores_raw = [float(s) for s in bm25.get_scores(terminos_query)]
        max_bm25 = max(scores_raw) if scores_raw else 0.0
        if max_bm25 > 0:
            bm25_scores = [(s / max_bm25) * 100.0 for s in scores_raw]

    for i, frag in enumerate(fragmentos):
        cos_sim = round((1 - frag["distance"]) * 100, 1)
        bm25_norm = round(bm25_scores[i], 1)
        meta = frag["metadata"]
        doc_name = meta.get("document_name", meta.get("source", meta.get("filename", "")))
        boost = RAGService._boost_metadata(terminos_query, doc_name)
        frag["doc"] = doc_name
        frag["page"] = meta.get("page", "?")
        frag["cos_score"] = cos_sim
        frag["bm25_score"] = bm25_norm
        frag["metadata_boost"] = round(boost, 1)
        frag["hybrid_score"] = round(
            (cos_sim * PESO_COSENO) + (bm25_norm * PESO_BM25) + boost, 1
        )

    fragmentos.sort(key=lambda x: x["hybrid_score"], reverse=True)
    return fragmentos[:TOP_REPORTE]


def snippet(texto: str, n: int = 150) -> str:
    return texto.replace("\n", " ").replace("|", "\\|").strip()[:n]


def main():
    rag = RAGService()
    lineas_md = []
    lineas_md.append("# Reporte de Diagnóstico de Umbrales (BAAI/bge-m3)\n")
    lineas_md.append(f"**Pool consultado:** top_{TOP_K_CANDIDATOS} de ChromaDB (sin filtros) · "
                     f"**Reportado:** Top {TOP_REPORTE} por pregunta · "
                     f"**Fórmula híbrida:** `(cos × {PESO_COSENO}) + (bm25 × {PESO_BM25}) + boost`\n")

    for etiqueta, pregunta in PREGUNTAS_PRUEBA:
        top = puntuar_sin_filtros(rag, pregunta)
        print(f"\n{etiqueta}: {pregunta}")
        for r, f in enumerate(top, 1):
            print(f"  Top {r} | cos={f['cos_score']:6.1f} | hib={f['hybrid_score']:6.1f} "
                  f"| bm25={f['bm25_score']:5.1f} | boost={f['metadata_boost']:5.1f} | {f['doc']}")

        lineas_md.append("---\n")
        lineas_md.append(f"## {etiqueta}: {pregunta}\n")
        lineas_md.append("| Rank | Documento / Fuente | Cos Score | Hybrid Score | Snippet del Texto |")
        lineas_md.append("|---|---|---|---|---|")
        for r, f in enumerate(top, 1):
            linea_extra = []
            if f["bm25_score"]:
                linea_extra.append(f"bm25={f['bm25_score']}")
            if f["metadata_boost"]:
                linea_extra.append(f"boost=+{f['metadata_boost']}")
            detalle = f" ({', '.join(linea_extra)})" if linea_extra else ""
            lineas_md.append(
                f"| Top {r} | {f['doc']} (p.{f['page']}){detalle} "
                f"| {f['cos_score']} | {f['hybrid_score']} | {snippet(f['content'])} |"
            )
        if not top:
            lineas_md.append("| — | *(sin resultados)* | — | — | — |")
        lineas_md.append("")

    lineas_md.append("---\n")
    lineas_md.append("## Código Actual de Umbrales en rag.py\n")
    lineas_md.append(f"- `UMBRAL_COS_RELEVANTE` actual: **{UMBRAL_COS_RELEVANTE}**")
    lineas_md.append(f"- `UMBRAL_HIBRIDO_RELEVANTE` actual: **{UMBRAL_HIBRIDO_RELEVANTE}**")
    lineas_md.append(f"- `UMBRAL_COS_FALLBACK` actual (Top-1 sin filtros previos): **{UMBRAL_COS_FALLBACK}**\n")

    salida = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../DIAGNOSTICO_BGE_M3.md"))
    with open(salida, "w") as f:
        f.write("\n".join(lineas_md))

    print("\n" + "=" * 60)
    print(f"OK -> Archivo DIAGNOSTICO_BGE_M3.md generado exitosamente en:\n   {salida}")
    print("=" * 60)


if __name__ == "__main__":
    main()
