import json
import os
import re
import unicodedata
from typing import List, Dict, Any, Optional, Generator
import chromadb
from sqlalchemy.orm import Session

from backend.services.embeddings import EmbeddingService
from backend.services.llm import LLMService
from backend.models.conversation import Conversation, Message
from backend.utils.text_cleaner import (
    limpiar_texto_pasaje,
    formatear_cita,
    nombre_documento_legible,
    sin_tildes,
    ACRONIMOS_DOC,
    PALABRAS_ESTRUCTURALES,
)

# Aliases para compatibilidad interna
_formatear_cita = formatear_cita
_nombre_documento_legible = nombre_documento_legible
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

# Mapa de temas conocidos del dominio
TEMAS_CONOCIDOS = {
    "vacaciones": ["vacaciones", "vacacion", "descanso", "dias libres", "periodo vacacional"],
    "teletrabajo": ["teletrabajo", "remoto", "home office", "trabajo desde casa"],
    "contrato": ["contrato", "clausula", "vigencia", "terminacion", "obligaciones"],
    "seguridad": ["seguridad", "password", "acceso", "datos", "incidente", "politica de seguridad"],
    "sanciones": ["sancion", "amonestacion", "suspension", "despido", "penalidad"],
    "permisos": ["permiso", "licencia", "incapacidad", "medico", "enfermedad"],
    "renuncia": ["renuncia", "renunciar", "desvinculacion", "salida", "baja"],
    "salario": ["salario", "sueldo", "bono", "compensacion", "pago"],
}

# --- Parametros de puntuacion y filtrado RAG ---
# Calibrados para intfloat/multilingual-e5-small (384D):
# En E5, los fragmentos relevantes in-domain van de cos ~83% a ~94%,
# y el ruido out-of-domain se ubica en <78%. El corte en 80.5% / 81.5% aisla el ruido perfectamente.
PESO_COSENO = 0.65              # Peso semantico dentro del score hibrido
PESO_BM25 = 0.35                # Peso lexico dentro del score hibrido
UMBRAL_COS_RELEVANTE = 80.5     # Coseno minimo para considerar relevante un fragmento
UMBRAL_HIBRIDO_RELEVANTE = 81.5  # Score hibrido minimo para considerar relevante un fragmento
UMBRAL_COS_FALLBACK = 78.5      # Coseno minimo para aceptar el Top-1 cuando nadie pasa umbrales
METADATA_BOOST = 10.0           # Bonus por coincidencia pregunta <-> nombre de archivo

# Sinonimos de dominio: termino de la pregunta -> tokens esperables en el nombre
# del documento. Permite que 'incapacidad' o 'bono' apunten a los archivos
# politica_permisos_licencias / politica_salario_beneficios aunque el nombre del
# archivo no contenga literalmente esas palabras.
SINONIMOS_NOMBRE_DOC = {
    "salario": {"salario"},
    "salarios": {"salario"},
    "sueldo": {"salario"},
    "sueldos": {"salario"},
    "nomina": {"salario"},
    "remuneracion": {"salario"},
    "remunerado": {"salario"},
    "bono": {"salario"},
    "bonos": {"salario"},
    "prima": {"salario"},
    "aumento": {"salario"},
    "aumentos": {"salario"},
    "beneficio": {"salario", "beneficios"},
    "beneficios": {"salario", "beneficios"},
    "permiso": {"permisos", "licencias"},
    "permisos": {"permisos", "licencias"},
    "licencia": {"permisos", "licencias"},
    "licencias": {"permisos", "licencias"},
    "incapacidad": {"permisos", "licencias"},
    "incapacidades": {"permisos", "licencias"},
    "enfermedad": {"permisos", "licencias"},
    "luto": {"permisos", "licencias"},
    "matrimonio": {"permisos", "licencias"},
    "paternidad": {"permisos", "licencias"},
    "confidencial": {"contrato", "confidencialidad"},
    "confidencialidad": {"contrato", "confidencialidad"},
    "seguridad": {"seguridad"},
    "incidente": {"seguridad"},
    "viaje": {"gastos", "viaje"},
    "viajes": {"gastos", "viaje"},
    "viaticos": {"gastos", "viaje"},
    "gastos": {"gastos", "viaje"},
    "conducta": {"conducta"},
    "reglamento": {"reglamento", "interno"},
    "rrhh": {"manual", "rrhh"},
}

# Terminos calificadores/superlativos: si aparecen tanto en la pregunta como en
# una oracion candidata, esta recibe multiplicador x2 en _extraer_pasaje_clave.
# Formatos sin tildes para coincidir con la salida de _tokenizar.
CALIFICADORES_BOOST = {
    "excepcional", "excepcionales",
    "maximo", "maxima", "maximos", "maximas",
    "minimo", "minima", "minimos", "minimas",
    "destacado", "destacada",
    "superior", "superiores",
    "optimo", "optima",
    "prioritario", "prioritaria",
    "critico", "critica",
}


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
        
        self.cross_encoder = None
        use_ce = os.getenv("USE_CROSS_ENCODER", "false").lower() == "true"
        if CROSS_ENCODER_DISPONIBLE and use_ce:
            try:
                self.cross_encoder = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2", max_length=512)
            except Exception:
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
        except Exception:
            self._reset_coleccion()

    def _reset_coleccion(self):
        try:
            self.chroma_client.delete_collection("documents")
        except Exception:
            pass
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

    @staticmethod
    def _detectar_temas(texto: str) -> set:
        temas = set()
        texto_lower = texto.lower()
        for tema, keywords in TEMAS_CONOCIDOS.items():
            for kw in keywords:
                if kw in texto_lower:
                    temas.add(tema)
                    break
        return temas

    @staticmethod
    def _boost_metadata(terminos_pregunta: List[str], document_name: str) -> float:
        """
        Bonus METADATA_BOOST si algun termino relevante de la pregunta (o su
        sinonimo de dominio) coincide directamente con el nombre del documento.
        Ej.: pregunta con 'salario'/'bono' -> documento 'politica_salario_beneficios'.
        """
        if not terminos_pregunta or not document_name:
            return 0.0

        # Los nombres de archivo usan guiones bajos/puntos que \w trata como parte
        # de la palabra: normalizarlos a espacios para tokenizarlos por separado.
        # 'politica_salario_beneficios.docx' -> ['politica', 'salario', 'beneficios', 'docx']
        nombre_tokens = set(_tokenizar(re.sub(r"[\._\-]", " ", document_name)))
        objetivos: set = set()
        for termino in terminos_pregunta:
            objetivos.add(termino)
            objetivos |= SINONIMOS_NOMBRE_DOC.get(termino, set())

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
        except Exception as e:
            if "dimension" in str(e).lower() or "expecting" in str(e).lower():
                self._reset_coleccion()
                self.collection.upsert(
                    ids=ids,
                    embeddings=embeddings,
                    documents=documents,
                    metadatas=metadatas
                )
            else:
                raise e

    def eliminar_documento(self, document_id: int) -> None:
        try:
            results = self.collection.get(
                where={"document_id": document_id}
            )
            if results["ids"]:
                self.collection.delete(ids=results["ids"])
        except Exception:
            pass

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
            corpus = [_tokenizar(frag["content"]) for frag in fragmentos]
            bm25 = BM25Okapi(corpus)
            scores_raw = [float(s) for s in bm25.get_scores(terminos_query)]
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
            except Exception:
                pass

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
            fragmentos_relevantes = fragmentos_relevantes[:6]
        else:
            fragmentos_relevantes = []

        tiene_fragmentos_relevantes = bool(fragmentos_relevantes)

        fuentes = []
        contexto_parts = []

        for frag in fragmentos_relevantes:
            meta = frag["metadata"]
            contexto_parts.append(f"[{meta.get('document_name', 'Doc')}, página {meta.get('page', '?')}]: {frag['content']}")
            fuentes.append({
                "document": meta.get("document_name", "Desconocido"),
                "page": meta.get("page", 1),
                "section": meta.get("section", "General"),
                "content": frag["content"][:500]
            })

        contexto = "\n\n".join(contexto_parts)
        fuentes_str = "\n".join([f"- {f['document']}, p.{f['page']}" for f in fuentes])

        # Inyectar turnos conversacionales completos (usuario + asistente)
        historial_para_llm = historial[-6:] if historial else []

        return {
            "conversation": conversation,
            "historial": historial,
            "es_meta_pregunta": es_meta_pregunta,
            "es_cambio_tema": False,
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

        # Mostrar los fragmentos más relevantes completos y formateados limpiamente
        for frag in fragmentos[:5]:
            meta = frag.get("metadata", {})
            doc = meta.get("document_name", "Documento interno")
            pag = meta.get("page", 1)
            sec = meta.get("section", "")

            # Limpiar y estructurar el fragmento completo conservando listas y articulos
            pasaje = limpiar_texto_pasaje(frag["content"])
            if not pasaje or len(pasaje.strip()) < 20:
                pasaje = frag["content"].strip()

            cita = _formatear_cita(doc, pag, sec)
            bloques.append(f"#### {cita}\n\n{pasaje}")

        resp = "### Documentación Interna Consultada\n\n"
        resp += "\n\n---\n\n".join(bloques)
        return resp
