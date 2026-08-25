import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from sqlalchemy.orm import Session
from backend.database import SessionLocal
from backend.services.rag import RAGService

PREGUNTAS_TEST = [
    "¿Cuántos días de vacaciones me corresponden?",
    "¿En cuántos días debo cargar una incapacidad médica?",
    "¿Cuál es la política sobre el teletrabajo híbrido?",
    "¿Cuáles son las políticas de seguridad para contraseñas?",
    "¿Cómo se manejan los gastos de viaje y viáticos?"
]

def evaluar_calidad_rag():
    print("=" * 60)
    print("EVALUACIÓN DE CALIDAD DEL MOTOR RAG (Híbrido + Cross-Encoder)")
    print("=" * 60)

    rag = RAGService()
    db = SessionLocal()

    try:
        for idx, pregunta in enumerate(PREGUNTAS_TEST, 1):
            print(f"\n[Test {idx}] Pregunta: '{pregunta}'")
            print("-" * 50)
            
            resultado = rag._preparar_contexto_y_fuentes(pregunta=pregunta, db=db)
            fragmentos = resultado["fragmentos_relevantes"]

            if not fragmentos:
                print("  ❌ No se encontraron fragmentos relevantes (Fallback activado o sin resultados).")
            else:
                print(f"  ✅ {len(fragmentos)} fragmento(s) seleccionado(s) con alta relevancia:")
                for f_idx, frag in enumerate(fragmentos, 1):
                    meta = frag["metadata"]
                    doc = meta.get("document_name", "Desconocido")
                    pag = meta.get("page", 1)
                    cos = frag.get("cos_score", 0)
                    bm25 = frag.get("bm25_score", 0)
                    ce = frag.get("cross_encoder_score", "N/A")
                    hybrid = frag.get("hybrid_score", 0)
                    
                    print(f"    {f_idx}. Documento: {doc} (Pág. {pag})")
                    print(f"       Scores -> Coseno: {cos} | BM25: {bm25} | CrossEncoder: {ce} | Híbrido Final: {hybrid}")
                    print(f"       Extracto: \"{frag['content'][:150]}...\"")
    finally:
        db.close()

    print("\n" + "=" * 60)
    print("EVALUACIÓN FINALIZADA EXITOSAMENTE")
    print("=" * 60)

if __name__ == "__main__":
    evaluar_calidad_rag()
