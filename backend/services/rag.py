import json
import logging
import os
import re
import unicodedata
from typing import List, Dict, Any, Optional, Generator
import chromadb
from sqlalchemy.orm import Session

logger = logging.getLogger("policylens.rag")

from backend.services.embeddings import EmbeddingService
from backend.services.llm import LLMService
from backend.models.conversation import Conversation, Message

from backend.utils.text_cleaner import (
    limpiar_texto_pasaje,
    limpiar_boilerplate_institucional,
    formatear_cita,
    nombre_documento_legible,
    sin_tildes,
    resaltar_terminos_clave,
    extraer_pasaje_conciso,
    ACRONIMOS_DOC,
    PALABRAS_ESTRUCTURALES,
)


# Aliases para compatibilidad interna
_formatear_cita = formatear_cita
_nombre_documento_legible = nombre_documento_legible
_limpiar_boilerplate = limpiar_boilerplate_institucional
_PALABRAS_ESTRUCTURALES = PALABRAS_ESTRUCTURALES


try:
    from rank_bm25 import BM25Okapi
    BM25_DISPONIBLE = True
except ImportError:
    BM25_DISPONIBLE = False

try:
    from sentence_transformers import CrossEncoder
    CROSS_ENCODER_DISPONIBLE = True
except ImportError:
    CROSS_ENCODER_DISPONIBLE = False


def _sin_tildes(texto: str) -> str:
    """
    Elimina diacriticos: 'año'->'ano', 'días'->'dias', 'política'->'politica'.
    Permite que consultas escritas sin enie ni tildes coincidan con el texto
    de los documentos al tokenizar (matching lexico insensible a acentos).
    """
    return sin_tildes(texto)


def _tokenizar(texto: Optional[str]) -> List[str]:
    """Tokeniza en minusculas y sin diacriticos para scoring lexico (BM25)."""
    if not texto:
        return []
    return re.findall(r'\b\w+\b', _sin_tildes(str(texto).lower()))


# Stopwords en espanol: conectores y palabras gramaticales sin valor semantico.
# Se excluyen terminos de dominio RRHH ('dias', 'anos') por ser relevantes en consultas.
# Normalizadas sin tildes para comparar contra tokens ya normalizados.
STOPWORDS_ES = {
    'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un',
    'para', 'con', 'no', 'una', 'su', 'al', 'lo', 'como', 'mas', 'pero', 'sus', 'le',
    'ya', 'o', 'este', 'si', 'porque', 'esta', 'son', 'entre', 'esta', 'cuando', 'muy',
    'sin', 'sobre', 'tambien', 'me', 'hasta', 'hay', 'donde', 'quien', 'desde', 'todo',
    'nos', 'durante', 'todos', 'uno', 'les', 'ni', 'contra', 'otros', 'ese', 'eso',
    'ante', 'ellos', 'e', 'esto', 'mi', 'antes', 'algunos', 'que', 'cual', 'cuales',
    'cuantos', 'cuanto', 'cuanta', 'cuantas', 'tiene', 'tengo', 'es', 'como',
    'si', 'mi', 'tu', 'usted', 'yo', 'ella', 'ellos', 'ellas', 'nosotros', 'ustedes',
    'the', 'of', 'and', 'to', 'in', 'is'
}

# --- Parametros de puntuacion y filtrado RAG ---
# Calibración dinámica según el modelo de embeddings activo
_MODELO_ACTUAL = os.getenv("EMBEDDING_MODEL", os.getenv("EMBEDDING_MODEL_LOCAL", "qwen3-embedding:0.6b")).lower()
if "qwen" in _MODELO_ACTUAL:
    # Calibración para Qwen3-Embedding (1024D con Instruction-Tuning):
    PESO_COSENO = 0.70              # Peso semántico dentro del score híbrido
    PESO_BM25 = 0.30                # Peso léxico dentro del score híbrido
    UMBRAL_COS_RELEVANTE = 45.0     # Coseno mínimo para considerar relevante un fragmento
    UMBRAL_HIBRIDO_RELEVANTE = 48.0  # Score híbrido mínimo para considerar relevante un fragmento
    UMBRAL_COS_FALLBACK = 41.0      # Coseno mínimo para aceptar el Top-1 (calibrado para evitar ruido)
else:
    # Calibración para E5 (768D / 384D)
    PESO_COSENO = 0.65
    PESO_BM25 = 0.35
    UMBRAL_COS_RELEVANTE = 80.5
    UMBRAL_HIBRIDO_RELEVANTE = 81.5
    UMBRAL_COS_FALLBACK = 78.5

METADATA_BOOST = 10.0           # Bonus por coincidencia pregunta <-> nombre de archivo



def _es_tabla_de_contenido(texto: str) -> bool:
    if not texto:
        return False
    if len(re.findall(r'\.{4,}', texto)) >= 2:
        return True
    if ('tabla de contenido' in texto.lower() or 'índice' in texto.lower()) and len(re.findall(r'\.{2,}', texto)) >= 2:
        return True
    return False


class RAGService:
    """
    Servicio de orquestacion RAG (Retrieval-Augmented Generation).
    Soporta dos modos:
    - "rag": Embeddings + ChromaDB + LLM (respuesta sintetizada por IA)
    - "search": Embeddings locales + Extraccion estructurada (respuesta directa sin LLM)
    """

    _instance: Optional["RAGService"] = None

    def __new__(cls) -> "RAGService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True

        self.embedding_service = EmbeddingService()
        self.llm_service = LLMService()

        # Fix #10: BM25 in-memory cache — rebuilt only when corpus changes
        self._bm25_cache = None       # BM25Okapi instance
        self._bm25_corpus: Optional[List[List[str]]] = None   # tokenized corpus

        self.cross_encoder = None
        use_ce = os.getenv("USE_CROSS_ENCODER", "false").lower() == "true"
        if CROSS_ENCODER_DISPONIBLE and use_ce:
            try:
                self.cross_encoder = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2", max_length=512)
            except Exception as e:
                logger.warning(f"No se pudo inicializar CrossEncoder: {e}")
                self.cross_encoder = None


        # Ruta configurable via CHROMA_PATH; por defecto el almacén productivo
        # del proyecto. Los tests fijan esta variable para aislar su colección.
        chroma_path = os.getenv("CHROMA_PATH") or os.path.join(os.path.dirname(__file__), "../../chroma_data")
        os.makedirs(chroma_path, exist_ok=True)
        self.chroma_client = chromadb.PersistentClient(path=chroma_path)

        try:
            self.collection = self.chroma_client.get_or_create_collection(
                name="documents",
                metadata={"hnsw:space": "cosine"}
            )
        except Exception as e:
            logger.warning(f"Colección documents no encontrada o con esquema previo, reiniciando: {e}")
            self._reset_coleccion()

    def _reset_coleccion(self):
        try:
            self.chroma_client.delete_collection("documents")
            logger.info("Colección documents previa eliminada de ChromaDB.")
        except Exception as e:
            logger.debug(f"Colección documents no existía al resetear: {e}")
        self.collection = self.chroma_client.get_or_create_collection(
            name="documents",
            metadata={"hnsw:space": "cosine"}
        )

    @staticmethod
    def _es_pregunta_dependiente(pregunta: str, historial: List[Dict[str, str]]) -> bool:
        """
        Determina en <1ms si una pregunta es elíptica o dependiente del contexto anterior.
        """
        if not historial:
            return False
        p_clean = _sin_tildes(pregunta.lower().strip())
        tokens = re.findall(r'\b\w+\b', p_clean)
        if not tokens:
            return False

        # Si es ultra-corta (<= 4 palabras) cuando ya hay conversación previa (ej. "¿por qué?", "¿y cuánto?")
        if len(tokens) <= 4:
            return True

        # Marcadores explícitos de continuidad o referencia anafórica
        marcadores = [
            "pero", "y si", "en ese caso", "tampoco", "ademas", "asimismo",
            "sobre eso", "sobre ello", "respecto a eso", "respecto a ello",
            "cuales son esas", "cuales son esos", "a que se refiere", "como asi",
            "y para mi", "y en mi caso", "en dicho caso", "en esa situacion",
            "y si no", "si no estoy", "si no es", "si no son", "y que sanciones",
            "y cuales son", "y que pasa con", "y con respecto", "y en cuanto a"
        ]
        if any(m in p_clean for m in marcadores):
            return True

        # Inicia con conectores o pronombres interrogativos dependientes
        if tokens[0] in {"pero", "entonces", "ademas", "tampoco", "asimismo"}:
            return True

        return False

    @classmethod
    def _reformular_query_heuristica(cls, pregunta: str, historial: List[Dict[str, str]]) -> str:
        """
        Reformula una pregunta dependiente o de seguimiento usando heurísticas rápidas (<1ms)
        sin llamadas HTTP al LLM:
        - Extrae términos clave, temas y referencias normativas de los últimos mensajes del usuario.
        - Combina los términos contextuales esenciales con la nueva pregunta.
        """
        if not historial:
            return pregunta

        # Extraer los últimos mensajes de rol 'user'
        mensajes_usuario = [m.get("content", "") for m in historial if m.get("role") == "user"]
        if not mensajes_usuario:
            return pregunta

        ultimo_user_msg = mensajes_usuario[-1].strip()

        # 1. Detectar menciones normativas específicas (ej. "artículo 53", "cláusula 4", "política de seguridad")
        articulos_previos = re.findall(
            r'\b(?:articulo|art|clausula|seccion|politica)\s+\w+\b',
            _sin_tildes(ultimo_user_msg.lower())
        )

        # 2. Detectar tokens informativos del turno previo
        tokens_anteriores = [
            t for t in _tokenizar(ultimo_user_msg)
            if t not in STOPWORDS_ES and len(t) > 2
        ]

        terminos_contexto = []
        if articulos_previos:
            terminos_contexto.extend(articulos_previos)
        if tokens_anteriores:
            # Tomar los términos sustantivos más informativos (hasta 4)
            for tok in tokens_anteriores[:4]:
                if tok not in terminos_contexto:
                    terminos_contexto.append(tok)


        if terminos_contexto:
            # Filtrar términos que ya estén presentes en la pregunta nueva
            tokens_actuales = set(_tokenizar(pregunta))
            tokens_a_agregar = []
            for item in terminos_contexto:
                for sub_tok in item.split():
                    if sub_tok.lower() not in tokens_actuales and sub_tok.lower() not in tokens_a_agregar:
                        tokens_a_agregar.append(sub_tok)

            if tokens_a_agregar:
                return f"{' '.join(tokens_a_agregar)} {pregunta}".strip()

        return pregunta

    @classmethod
    def _detectar_cambio_tema(cls, pregunta: str, historial: List[Dict[str, str]]) -> bool:
        """
        Fix #18: Detecta si la nueva pregunta inicia un tema completamente diferente
        al discutido en los turnos anteriores, para desacoplar el contexto o etiquetarlo.
        """
        if not historial or cls._es_pregunta_dependiente(pregunta, historial):
            return False

        p_clean = _sin_tildes(pregunta.lower().strip())

        # 1. Marcadores explícitos de cambio de tema
        marcadores_cambio = [
            "cambiando de tema", "otra pregunta", "cambio de tema", "por otro lado",
            "pasando a otro tema", "ahora sobre", "tengo otra duda", "una pregunta distinta",
            "olvida lo anterior", "en otro asunto"
        ]
        if any(m in p_clean for m in marcadores_cambio):
            return True

        # 2. Solapamiento léxico de sustantivos clave (palabras >3 chars no stopwords)
        mensajes_usuario = [m.get("content", "") for m in historial if m.get("role") == "user"]
        if not mensajes_usuario:
            return False

        tokens_pregunta = set(_tokenizar(pregunta)) - STOPWORDS_ES
        tokens_historial = set()
        for msg in mensajes_usuario[-2:]:
            tokens_historial |= (set(_tokenizar(msg)) - STOPWORDS_ES)

        if len(tokens_pregunta) >= 4 and tokens_historial:
            if len(tokens_pregunta & tokens_historial) == 0:
                return True

        return False

    @staticmethod
    def _boost_metadata(terminos_pregunta: List[str], document_name: str) -> float:
        """
        Bonus METADATA_BOOST dinámico si algún término relevante de la pregunta
        coincide directamente con las palabras del nombre del documento.
        """
        if not terminos_pregunta or not document_name:
            return 0.0

        nombre_tokens = set(_tokenizar(re.sub(r"[\._\-]", " ", document_name)))
        objetivos = set(terminos_pregunta)
        return METADATA_BOOST if objetivos & nombre_tokens else 0.0


    def indexar_documento(self, chunks: List[Dict[str, Any]]) -> None:
        if not chunks:
            return

        ids = []
        documents = []
        metadatas = []

        for chunk in chunks:
            chunk_id = f"doc_{chunk['document_id']}_chunk_{chunk['chunk_index']}"
            ids.append(chunk_id)
            documents.append(chunk["content"])
            metadatas.append({
                "document_id": chunk["document_id"],
                "document_name": chunk["document_name"],
                "page": chunk["page"],
                "section": chunk["section"],
                "chunk_index": chunk["chunk_index"]
            })

        embeddings = self.embedding_service.generar_embeddings_lote(documents)

        try:
            self.collection.upsert(
                ids=ids,
                embeddings=embeddings,
                documents=documents,
                metadatas=metadatas
            )
            # Fix #10: Corpus changed — invalidate BM25 cache
            self._bm25_cache = None
            self._bm25_corpus = None
        except Exception as e:
            if "dimension" in str(e).lower() or "expecting" in str(e).lower():
                self._reset_coleccion()
                self.collection.upsert(
                    ids=ids,
                    embeddings=embeddings,
                    documents=documents,
                    metadatas=metadatas
                )
                self._bm25_cache = None
                self._bm25_corpus = None
            else:
                raise e

    def eliminar_documento(self, document_id: int) -> None:
        try:
            results = self.collection.get(
                where={"document_id": document_id}
            )
            if results["ids"]:
                self.collection.delete(ids=results["ids"])
                # Fix #10: Corpus changed — invalidate BM25 cache
                self._bm25_cache = None
                self._bm25_corpus = None
                logger.info(f"Chunks de documento ID={document_id} eliminados de ChromaDB.")
        except Exception as e:
            logger.warning(f"Error al eliminar chunks de documento ID={document_id} en ChromaDB: {e}")



    def buscar_fragmentos(self, pregunta: str, top_k: int = 5) -> List[Dict[str, Any]]:
        pregunta_embedding = self.embedding_service.generar_embedding(pregunta)

        try:
            results = self.collection.query(
                query_embeddings=[pregunta_embedding],
                n_results=top_k
            )
        except Exception as e:
            if "dimension" in str(e).lower() or "expecting" in str(e).lower():
                self._reset_coleccion()
                return []
            raise e

        fragmentos = []
        if results["documents"] and results["documents"][0]:
            for i, doc in enumerate(results["documents"][0]):
                fragmentos.append({
                    "content": doc,
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                    "distance": results["distances"][0][i] if results["distances"] else 0
                })

        return fragmentos

    @staticmethod
    def _limpiar_texto(texto: str) -> str:
        t = texto.replace('\r\n', '\n').replace('\r', '\n')
        t = re.sub(r"'\s*\n\s*'", ' ', t)
        t = re.sub(r'[ \t]+', ' ', t)
        t = re.sub(r'\n{3,}', '\n\n', t)
        return t.strip()

    def _extraer_pasaje_clave(self, pregunta: str, contenido: str) -> str:
        """
        Extrae el pasaje mas relevante del chunk para la respuesta directa del
        modo Search. Estrategia: puntuar oraciones individuales por solapamiento
        lexico con la pregunta (con multiplicador x2 si contienen un calificador
        presente en ella) y devolver la mejor junto con su vecina mas aporte.
        Si no hay senal diferencial, degrada al snippet por bloques historico.
        """
        contenido = self._limpiar_texto(contenido)

        # Texto corto: devolver completo sin fragmentar
        if len(contenido) < 600:
            return contenido

        palabras = set(_tokenizar(pregunta)) - STOPWORDS_ES
        if not palabras:
            return self._pasaje_por_bloques(pregunta, contenido)

        calificadores_pregunta = palabras & CALIFICADORES_BOOST

        # 1) Division por oraciones: puntuacion (.!?) seguida de espacio/salto
        oraciones = [o.strip() for o in re.split(r'(?<=[.!?])\s+', contenido) if o.strip()]
        if len(oraciones) <= 1:
            return self._pasaje_por_bloques(pregunta, contenido)

        # 2) Puntuacion por oracion: solapamiento de keywords de la pregunta;
        #    x2.0 si la oracion contiene un calificador/superlativo de la pregunta
        puntuadas = []
        for idx, oracion in enumerate(oraciones):
            tokens = set(_tokenizar(oracion))
            score = float(sum(1 for p in palabras if p in tokens))
            if score > 0 and calificadores_pregunta & tokens:
                score *= 2.0
            puntuadas.append((score, idx))

        mejor_score, mejor_idx = max(puntuadas, key=lambda x: x[0])

        # 3) Ninguna oracion coincide con la pregunta: snippet por defecto
        if mejor_score <= 0:
            return self._pasaje_por_bloques(pregunta, contenido)

        # Vecino adyacente con mayor aporte; empate -> el siguiente (continuidad)
        prev_idx = mejor_idx - 1 if mejor_idx > 0 else None
        next_idx = mejor_idx + 1 if mejor_idx + 1 < len(oraciones) else None
        if prev_idx is None:
            vecino_idx = next_idx
        elif next_idx is None:
            vecino_idx = prev_idx
        else:
            vecino_idx = next_idx if puntuadas[next_idx][0] >= puntuadas[prev_idx][0] else prev_idx

        pasaje = ' '.join(oraciones[i] for i in sorted({mejor_idx, vecino_idx}))

        # Fallback final: pasaje demasiado corto -> devolver el chunk completo
        if len(pasaje.strip()) < 100:
            return contenido

        return pasaje

    def _pasaje_por_bloques(self, pregunta: str, contenido: str) -> str:
        """Snippet por defecto: seleccion de parrafos narrativos (comportamiento historico)."""
        # Division por parrafos; si no hay saltos dobles, reintentar con saltos sencillos
        bloques = [b.strip() for b in contenido.split('\n\n') if b.strip()]
        if len(bloques) <= 1:
            bloques = [b.strip() for b in contenido.split('\n') if b.strip()]
        if not bloques:
            return contenido

        palabras = set(_tokenizar(pregunta)) - STOPWORDS_ES

        bloques_puntuados = []
        for b in bloques:
            # Encabezados Markdown o lineas cortas (< 80 chars): score 0,
            # nunca se seleccionan de forma aislada como pasaje principal
            if b.startswith('#') or len(b) < 80 or not palabras:
                bloques_puntuados.append((0.0, b))
                continue

            b_tokens = set(_tokenizar(b))
            coincidencias = sum(1 for p in palabras if p in b_tokens)
            score = coincidencias / max(1, len(palabras))
            # Bonus por terminos de dominio, solo en parrafos narrativos
            if any(h in b_tokens for h in ['seccion', 'clausula', 'articulo', 'politica', 'derecho', 'vigencia', 'vacaciones', 'teletrabajo']):
                score += 0.25
            bloques_puntuados.append((score, b))

        bloques_puntuados.sort(key=lambda x: x[0], reverse=True)
        mejores = [b for s, b in bloques_puntuados if s > 0.15][:2]

        if mejores:
            pasaje = '\n\n'.join(mejores)
        else:
            # Sin narrativa puntuada: preferir los primeros bloques NO encabezado
            narrativos = [b for b in bloques if not (b.startswith('#') or len(b) < 80)]
            pasaje = '\n\n'.join((narrativos or bloques)[:2])

        # Fallback final: pasaje demasiado corto -> devolver el chunk completo
        if len(pasaje.strip()) < 100:
            return contenido

        return pasaje

    def _preparar_contexto_y_fuentes(
        self,
        pregunta: str,
        db: Session,
        conversation_id: Optional[int] = None,
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Recupera el historial conversacional, ejecuta la búsqueda semántica e híbrida
        y prepara las fuentes y el contexto para la generación.
        """
        # 1. Recuperar conversación existente o crear una nueva
        conversation = None
        if conversation_id:
            conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()

        if not conversation:
            conversation = Conversation(user_id=user_id)
            db.add(conversation)
            db.commit()
            db.refresh(conversation)

        # 2. Cargar historial previo de la conversación (turnos completos usuario + asistente)
        historial = []
        if conversation.messages:
            for msg in conversation.messages:
                historial.append({
                    "role": msg.role,
                    "content": msg.content
                })

        # 3. Detectar si es meta-pregunta o pregunta dependiente del diálogo (Híbrido Condicional)
        pregunta_expandida = pregunta
        pregunta_lower = pregunta_expandida.lower()
        es_meta_pregunta = any(kw in pregunta_lower for kw in [
            "primera pregunta", "primer tema", "qué te pregunté", "te pregunté", "te dije",
            "qué dijimos", "de qué hablabamos", "de qué hablamos", "resumen", "conversado",
            "anteriormente", "historial", "conversación"
        ])

        query_busqueda = pregunta_expandida
        if historial and not es_meta_pregunta and self._es_pregunta_dependiente(pregunta_expandida, historial):
            query_heuristica = self._reformular_query_heuristica(pregunta_expandida, historial)
            tokens_h = [w for w in _tokenizar(query_heuristica) if w not in STOPWORDS_ES and len(w) > 2]
            if len(tokens_h) >= 2:
                query_busqueda = query_heuristica
            else:
                query_busqueda = self.llm_service.reescribir_query_contextual(pregunta_expandida, historial)

        # 4. Buscar fragmentos relevantes (top_k=15)
        fragmentos = self.buscar_fragmentos(query_busqueda, top_k=15)

        # Filtrar tablas de contenido o índices para priorizar contenido sustantivo
        fragmentos_sin_toc = [f for f in fragmentos if not _es_tabla_de_contenido(f.get("content", ""))]
        if fragmentos_sin_toc:
            fragmentos = fragmentos_sin_toc

        # 5. Calcular scores combinados (semántico + BM25 léxico)
        terminos_query = [
            w for w in _tokenizar(query_busqueda)
            if w not in STOPWORDS_ES and len(w) > 2
        ]

        bm25_scores: List[float] = [0.0] * len(fragmentos)
        if BM25_DISPONIBLE and terminos_query and fragmentos:
            # Fix #10: Use or build cached BM25 index
            current_corpus = [_tokenizar(frag["content"]) for frag in fragmentos]
            if self._bm25_cache is None or self._bm25_corpus != current_corpus:
                self._bm25_corpus = current_corpus
                self._bm25_cache = BM25Okapi(current_corpus)
            scores_raw = [float(s) for s in self._bm25_cache.get_scores(terminos_query)]
            max_bm25 = max(scores_raw) if scores_raw else 0.0
            if max_bm25 > 0:
                bm25_scores = [(s / max_bm25) * 100.0 for s in scores_raw]


        for i, frag in enumerate(fragmentos):
            cos_sim = round((1 - frag["distance"]) * 100, 1)
            bm25_norm = round(bm25_scores[i], 1)
            boost_doc = self._boost_metadata(
                terminos_query,
                frag["metadata"].get("document_name", "")
            )
            frag["cos_score"] = cos_sim
            frag["bm25_score"] = bm25_norm
            frag["metadata_boost"] = boost_doc
            frag["hybrid_score"] = round((cos_sim * PESO_COSENO) + (bm25_norm * PESO_BM25) + boost_doc, 1)

        # Re-ranking con Cross-Encoder si está disponible
        if self.cross_encoder and fragmentos:
            try:
                pairs = [(query_busqueda, frag["content"]) for frag in fragmentos]
                ce_scores = self.cross_encoder.predict(pairs)
                max_ce = max(ce_scores) if len(ce_scores) > 0 else 1.0
                min_ce = min(ce_scores) if len(ce_scores) > 0 else 0.0
                ce_range = (max_ce - min_ce) if (max_ce - min_ce) > 0 else 1.0

                for i, frag in enumerate(fragmentos):
                    norm_ce = ((ce_scores[i] - min_ce) / ce_range) * 100.0
                    frag["cross_encoder_score"] = round(norm_ce, 1)
                    frag["hybrid_score"] = round((frag["hybrid_score"] * 0.7) + (norm_ce * 0.3), 1)
            except Exception as e:
                logger.warning(f"Error durante re-ranking con CrossEncoder: {e}")


        fragmentos.sort(key=lambda x: x.get("hybrid_score", 0), reverse=True)

        if fragmentos:
            fragmentos_relevantes_raw = [
                f for f in fragmentos
                if f.get("cos_score", 0) >= UMBRAL_COS_RELEVANTE
                and f.get("hybrid_score", 0) >= UMBRAL_HIBRIDO_RELEVANTE
            ]

            if not fragmentos_relevantes_raw:
                mejor = fragmentos[0]
                if mejor.get("cos_score", 0) >= UMBRAL_COS_FALLBACK:
                    fragmentos_relevantes_raw = [mejor]

            seen_chunks = set()
            fragmentos_relevantes = []
            for f in fragmentos_relevantes_raw:
                meta = f.get("metadata", {})
                chunk_key = (meta.get("document_name"), meta.get("page"), meta.get("chunk_index"))
                if chunk_key not in seen_chunks:
                    seen_chunks.add(chunk_key)
                    fragmentos_relevantes.append(f)
            fragmentos_relevantes = fragmentos_relevantes[:3]
        else:
            fragmentos_relevantes = []

        tiene_fragmentos_relevantes = bool(fragmentos_relevantes)

        fuentes = []
        contexto_parts = []

        for frag in fragmentos_relevantes:
            meta = frag["metadata"]
            doc_name = meta.get("document_name", "Documento interno")
            doc_legible = _nombre_documento_legible(doc_name)
            pag = meta.get("page", 1)
            sec = meta.get("section", "")

            header_doc = f"{doc_legible} (Pág. {pag})"
            if sec and sec.lower() not in ("general", f"pagina {pag}"):
                header_doc += f" - {sec}"

            # Limpiar boilerplate del contenido antes de agregarlo al contexto
            contenido_limpio = _limpiar_boilerplate(frag['content'])
            contexto_parts.append(f"#### {header_doc}\n{contenido_limpio}")
            fuentes.append({
                "document": doc_name,
                "page": pag,
                "section": sec or "General",
                "content": frag["content"]
            })

        contexto = "\n\n".join(contexto_parts)
        fuentes_str = "\n".join([f"- {f['document']}, p.{f['page']}" for f in fuentes])

        # Inyectar turnos conversacionales completos (usuario + asistente)
        historial_para_llm = historial[-4:] if historial else []
        es_cambio_tema = self._detectar_cambio_tema(pregunta, historial)

        return {
            "conversation": conversation,
            "historial": historial,
            "es_meta_pregunta": es_meta_pregunta,
            "es_cambio_tema": es_cambio_tema,
            "query_busqueda": query_busqueda,
            "fragmentos_relevantes": fragmentos_relevantes,
            "tiene_fragmentos_relevantes": tiene_fragmentos_relevantes,
            "fuentes": fuentes,
            "contexto": contexto,
            "fuentes_str": fuentes_str,
            "historial_para_llm": historial_para_llm,
        }



    def preguntar(
        self,
        pregunta: str,
        db: Session,
        conversation_id: Optional[int] = None,
        mode: str = "rag",
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Orquesta el flujo síncrono RAG: recuperar/crear conversación, buscar contexto,
        incorporar historial conversacional, generar respuesta (vía LLM o búsquedas locales)
        y guardar mensajes en la BD.
        """
        prep = self._preparar_contexto_y_fuentes(pregunta, db, conversation_id, user_id=user_id)
        conversation = prep["conversation"]
        fuentes = prep["fuentes"]
        tiene_fragmentos_relevantes = prep["tiene_fragmentos_relevantes"]
        fragmentos_relevantes = prep["fragmentos_relevantes"]
        historial = prep["historial"]
        es_meta_pregunta = prep["es_meta_pregunta"]
        contexto = prep["contexto"]
        fuentes_str = prep["fuentes_str"]
        historial_para_llm = prep["historial_para_llm"]

        if mode == "search":
            if not tiene_fragmentos_relevantes:
                respuesta = f"No encontré información relevante en los documentos indexados para responder a: \"{pregunta}\"."
                fuentes = []
            else:
                respuesta = self._formatear_respuesta_solo_embeddings(pregunta, fragmentos_relevantes)
        else:
            if not tiene_fragmentos_relevantes and not historial and not es_meta_pregunta:
                respuesta = f"No encontré información relevante en los documentos indexados para responder a: \"{pregunta}\"."
                fuentes = []
            else:
                try:
                    respuesta = self.llm_service.generar_respuesta(
                        pregunta=pregunta,
                        contexto=contexto if tiene_fragmentos_relevantes else "",
                        fuentes=fuentes_str if tiene_fragmentos_relevantes else None,
                        historial=historial_para_llm
                    )
                    if not respuesta or not respuesta.strip():
                        respuesta = "No fue posible generar una respuesta a partir del contexto."
                except Exception as e:
                    respuesta = f"Error al generar la respuesta con el LLM: {str(e)}"

        # Guardar mensajes en la base de datos vinculados a conversation.id
        msg_user = Message(
            conversation_id=conversation.id,
            role="user",
            content=pregunta
        )
        msg_assistant = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=respuesta
        )
        db.add_all([msg_user, msg_assistant])
        db.commit()

        return {
            "answer": respuesta,
            "sources": fuentes,
            "conversation_id": conversation.id
        }

    def preguntar_stream(
        self,
        pregunta: str,
        db: Optional[Session] = None,
        conversation_id: Optional[int] = None,
        mode: str = "rag",
        user_id: Optional[int] = None
    ) -> Generator[str, None, None]:
        """
        Generador SSE para streaming de respuestas en tiempo real.
        Emite eventos estructurados en formato 'data: <json>\n\n'.
        """
        from backend.database import SessionLocal

        should_close = False
        if db is None:
            db = SessionLocal()
            should_close = True

        try:
            prep = self._preparar_contexto_y_fuentes(pregunta, db, conversation_id, user_id=user_id)
            conversation = prep["conversation"]
            fuentes = prep["fuentes"]
            tiene_relevantes = prep["tiene_fragmentos_relevantes"]
            fragmentos_relevantes = prep["fragmentos_relevantes"]
            historial = prep["historial"]
            es_meta_pregunta = prep["es_meta_pregunta"]
            contexto = prep["contexto"]
            fuentes_str = prep["fuentes_str"]
            historial_para_llm = prep["historial_para_llm"]

            # 1. Evento de inicio con metadatos de conversación y fuentes
            start_payload = {
                "type": "start",
                "conversation_id": conversation.id,
                "sources": fuentes
            }
            yield f"data: {json.dumps(start_payload, ensure_ascii=False)}\n\n"

            respuesta_acumulada = ""

            if mode == "search":
                if not tiene_relevantes:
                    respuesta_acumulada = f"No encontré información relevante en los documentos indexados para responder a: \"{pregunta}\"."
                else:
                    respuesta_acumulada = self._formatear_respuesta_solo_embeddings(pregunta, fragmentos_relevantes)

                token_payload = {"type": "token", "content": respuesta_acumulada}
                yield f"data: {json.dumps(token_payload, ensure_ascii=False)}\n\n"

            else:
                # Modo RAG (con LLM)
                if not tiene_relevantes and not historial and not es_meta_pregunta:
                    respuesta_acumulada = f"No encontré información relevante en los documentos indexados para responder a: \"{pregunta}\"."
                    token_payload = {"type": "token", "content": respuesta_acumulada}
                    yield f"data: {json.dumps(token_payload, ensure_ascii=False)}\n\n"
                else:
                    try:
                        for token in self.llm_service.generar_respuesta_stream(
                            pregunta=pregunta,
                            contexto=contexto if tiene_relevantes else "",
                            fuentes=fuentes_str if tiene_relevantes else None,
                            historial=historial_para_llm
                        ):
                            respuesta_acumulada += token
                            token_payload = {"type": "token", "content": token}
                            yield f"data: {json.dumps(token_payload, ensure_ascii=False)}\n\n"

                        if not respuesta_acumulada.strip():
                            respuesta_acumulada = "No fue posible generar una respuesta a partir del contexto."
                            token_payload = {"type": "token", "content": respuesta_acumulada}
                            yield f"data: {json.dumps(token_payload, ensure_ascii=False)}\n\n"

                    except Exception as e:
                        err_msg = f"Error al generar la respuesta con el LLM: {str(e)}"
                        respuesta_acumulada += f"\n{err_msg}" if respuesta_acumulada else err_msg
                        token_payload = {"type": "token", "content": f"\n{err_msg}" if respuesta_acumulada != err_msg else err_msg}
                        yield f"data: {json.dumps(token_payload, ensure_ascii=False)}\n\n"

            # 2. Persistir mensajes en base de datos al finalizar el stream
            if respuesta_acumulada.strip():
                msg_user = Message(
                    conversation_id=conversation.id,
                    role="user",
                    content=pregunta
                )
                msg_assistant = Message(
                    conversation_id=conversation.id,
                    role="assistant",
                    content=respuesta_acumulada
                )
                db.add_all([msg_user, msg_assistant])
                db.commit()

            # 3. Evento final 'done'
            done_payload = {
                "type": "done",
                "conversation_id": conversation.id,
                "answer": respuesta_acumulada
            }
            yield f"data: {json.dumps(done_payload, ensure_ascii=False)}\n\n"

        except GeneratorExit:
            # Cliente canceló la conexión / cerró la pestaña
            logger.info(f"Stream cancelado por el cliente para conversación {conversation.id if 'conversation' in locals() and conversation else 'N/A'}")
            try:
                if 'respuesta_acumulada' in locals() and respuesta_acumulada.strip() and 'conversation' in locals() and conversation:
                    msg_user = Message(conversation_id=conversation.id, role="user", content=pregunta)
                    msg_assistant = Message(conversation_id=conversation.id, role="assistant", content=respuesta_acumulada)
                    db.add_all([msg_user, msg_assistant])
                    db.commit()
            except Exception:
                pass
        except Exception as e:
            err_payload = {"type": "error", "error": str(e)}
            yield f"data: {json.dumps(err_payload, ensure_ascii=False)}\n\n"
        finally:
            if should_close:
                db.close()


    def _formatear_respuesta_solo_embeddings(self, pregunta: str, fragmentos: List[Dict[str, Any]]) -> str:
        if not fragmentos:
            return f"No se encontró información relevante en los documentos para responder a: \"{pregunta}\"."

        top = fragmentos[0]
        if top.get("cos_score", 0) < UMBRAL_COS_RELEVANTE and top.get("hybrid_score", 0) < UMBRAL_HIBRIDO_RELEVANTE:
            return (
                f"No se encontró una coincidencia concluyente en las políticas y contratos indexados para: \"{pregunta}\".\n\n"
                f"Te sugerimos reformular los términos de búsqueda o consultar directamente con el área de Recursos Humanos."
            )

        bloques = []

        # Mostrar los top 2 o 3 fragmentos más relevantes de forma concisa y sin saturar
        for frag in fragmentos[:3]:
            meta = frag.get("metadata", {})
            doc = meta.get("document_name", "Documento interno")
            pag = meta.get("page", 1)
            sec = meta.get("section", "")

            # 1. Limpiar y estructurar el pasaje (eliminando membretes)
            pasaje_limpio = limpiar_texto_pasaje(frag["content"])
            if not pasaje_limpio or len(pasaje_limpio.strip()) < 20:
                pasaje_limpio = frag["content"].strip()

            # 2. Extraer los párrafos y artículos más directos al grano
            pasaje_conciso = extraer_pasaje_conciso(pasaje_limpio, pregunta, max_chars=750)

            # 3. Resaltar términos clave de la consulta en negrita
            pasaje_resaltado = resaltar_terminos_clave(pasaje_conciso, pregunta)

            cita = _formatear_cita(doc, pag, sec)
            bloques.append(f"#### {cita}\n\n{pasaje_resaltado}")

        resp = "### Documentación Interna Consultada\n\n"
        resp += "\n\n---\n\n".join(bloques)
        return resp

