import os
import re
import unicodedata
from typing import List, Dict, Any, Optional
import chromadb
from sqlalchemy.orm import Session

from backend.services.embeddings import EmbeddingService
from backend.services.llm import LLMService
from backend.models.conversation import Conversation, Message

try:
    from rank_bm25 import BM25Okapi
    BM25_DISPONIBLE = True
except ImportError:
    BM25_DISPONIBLE = False


def _sin_tildes(texto: str) -> str:
    """
    Elimina diacriticos: 'año'->'ano', 'días'->'dias', 'política'->'politica'.
    Permite que consultas escritas sin enie ni tildes coincidan con el texto
    de los documentos al tokenizar (matching lexico insensible a acentos).
    """
    return ''.join(c for c in unicodedata.normalize('NFD', texto) if unicodedata.category(c) != 'Mn')


def _tokenizar(texto: str) -> List[str]:
    """Tokeniza en minusculas y sin diacriticos para scoring lexico (BM25)."""
    return re.findall(r'\b\w+\b', _sin_tildes(texto.lower()))


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

        chroma_path = os.path.join(os.path.dirname(__file__), "../../chroma_data")
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
    def _detectar_temas(texto: str) -> set:
        temas = set()
        texto_lower = texto.lower()
        for tema, keywords in TEMAS_CONOCIDOS.items():
            for kw in keywords:
                if kw in texto_lower:
                    temas.add(tema)
                    break
        return temas

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

        embeddings = self.embedding_service.generar_embeddings_lote(documents, local=True)

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

    def buscar_fragmentos(self, pregunta: str, top_k: int = 5, local: bool = True) -> List[Dict[str, Any]]:
        pregunta_embedding = self.embedding_service.generar_embedding(pregunta, local=local)

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
        contenido = self._limpiar_texto(contenido)

        # Texto corto: devolver completo sin fragmentar
        if len(contenido) < 600:
            return contenido

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

    def preguntar(
        self,
        pregunta: str,
        db: Session,
        conversation_id: Optional[int] = None,
        mode: str = "rag"
    ) -> Dict[str, Any]:
        """
        Orquesta el flujo completo RAG: recuperar/crear conversación, buscar contexto,
        incorporar historial conversacional, generar respuesta (vía LLM o búsquedas locales)
        y guardar mensajes en la BD.
        """
        # 1. Recuperar conversación existente o crear una nueva
        conversation = None
        if conversation_id:
            conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()

        if not conversation:
            conversation = Conversation()
            db.add(conversation)
            db.commit()
            db.refresh(conversation)

        # 2. Cargar historial previo de la conversación (solo preguntas del usuario)
        historial = []
        ultimas_preguntas_usuario = []
        if conversation.messages:
            for msg in conversation.messages:
                historial.append({
                    "role": msg.role,
                    "content": msg.content
                })
                if msg.role == "user":
                    ultimas_preguntas_usuario.append(msg.content)

        # 3. Detectar cambio de tema
        temas_nuevos = self._detectar_temas(pregunta)
        temas_previos = set()
        if ultimas_preguntas_usuario:
            for p in ultimas_preguntas_usuario[-3:]:
                temas_previos |= self._detectar_temas(p)

        es_cambio_tema = (
            len(temas_nuevos) > 0
            and len(temas_previos) > 0
            and not temas_nuevos & temas_previos
        )

        # 4. Construir query de búsqueda
        pregunta_lower = pregunta.lower()
        es_meta_pregunta = any(kw in pregunta_lower for kw in [
            "primera pregunta", "primer tema", "qué te pregunté", "te pregunté", "te dije",
            "qué dijimos", "de qué hablabamos", "de qué hablamos", "resumen", "conversado",
            "anteriormente", "historial", "conversación"
        ])

        query_busqueda = pregunta
        es_pregunta_corta_o_seguimiento = (
            len(pregunta.split()) < 12 or
            any(kw in pregunta_lower for kw in ["y si", "y para", "y en", "cuántos", "cuál", "cuáles", "esto", "eso", "llevo", "sobre", "anterior", "mismo", "mismas", "muéstrame", "muestra", "artículo", "sección", "página"])
        )

        # Solo agregar contexto previo si NO es cambio de tema
        if (
            historial
            and ultimas_preguntas_usuario
            and es_pregunta_corta_o_seguimiento
            and not es_meta_pregunta
            and not es_cambio_tema
        ):
            ultimo_contexto = ultimas_preguntas_usuario[-1]
            query_busqueda = f"{ultimo_contexto} {pregunta}"

        # 5. Buscar fragmentos relevantes
        fragmentos = self.buscar_fragmentos(query_busqueda, top_k=12, local=True)

        # 4. Calcular scores combinados (semántico + BM25 léxico)
        # Términos de consulta sin stopwords ni tildes: preguntas largas en lenguaje
        # natural no penalizan el score léxico y 'año'/'ano' o 'días'/'dias' equivalen.
        terminos_query = [
            w for w in _tokenizar(pregunta)
            if w not in STOPWORDS_ES and len(w) > 2
        ]

        bm25_scores: List[float] = [0.0] * len(fragmentos)
        if BM25_DISPONIBLE and terminos_query and fragmentos:
            corpus = [_tokenizar(frag["content"]) for frag in fragmentos]
            bm25 = BM25Okapi(corpus)
            # get_scores retorna un ndarray: convertir a lista para evitar ambiguedad booleana
            scores_raw = [float(s) for s in bm25.get_scores(terminos_query)]
            max_bm25 = max(scores_raw) if scores_raw else 0.0
            if max_bm25 > 0:
                # Normalización relativa a 0-100: ranking entre los fragments recuperados
                bm25_scores = [(s / max_bm25) * 100.0 for s in scores_raw]

        for i, frag in enumerate(fragmentos):
            cos_sim = round((1 - frag["distance"]) * 100, 1)
            bm25_norm = round(bm25_scores[i], 1)
            frag["cos_score"] = cos_sim
            frag["bm25_score"] = bm25_norm
            frag["hybrid_score"] = (cos_sim * 0.7) + (bm25_norm * 0.3)

        # Ordenar por score híbrido
        fragmentos.sort(key=lambda x: x.get("hybrid_score", 0), reverse=True)

        # Filtrar fuentes verdaderamente relevantes para la respuesta
        if fragmentos:
            top_score = fragmentos[0].get("hybrid_score", 0)
            fragmentos_relevantes_raw = [
                f for f in fragmentos
                if f.get("hybrid_score", 0) >= max(38.0, top_score - 14.0) and f.get("cos_score", 0) >= 38.0
            ]
            if not fragmentos_relevantes_raw:
                fragmentos_relevantes_raw = [fragmentos[0]]

            # Deduplicar por documento, quedarse con el chunk de mayor score, máximo 2
            seen_docs = set()
            fragmentos_relevantes = []
            for f in fragmentos_relevantes_raw:
                doc_name = f["metadata"].get("document_name", "")
                if doc_name not in seen_docs:
                    seen_docs.add(doc_name)
                    fragmentos_relevantes.append(f)
            fragmentos_relevantes = fragmentos_relevantes[:2]  # Máximo 2 chunks al LLM
        else:
            fragmentos_relevantes = []

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

        # 5. Generar respuesta según el modo seleccionado (RAG o Search)
        tiene_fragmentos_relevantes = bool(
            fragmentos and 
            (fragmentos[0].get("cos_score", 0) >= 35.0 or fragmentos[0].get("hybrid_score", 0) >= 36.0)
        )

        if mode == "search":
            if not tiene_fragmentos_relevantes:
                respuesta = f"No encontré información relevante en los documentos indexados para responder a: \"{pregunta}\"."
                fuentes = []
            else:
                respuesta = self._formatear_respuesta_solo_embeddings(pregunta, fragmentos_relevantes)
        else:
            # Modo RAG (con LLM)
            # Si NO hay fragmentos relevantes Y NO hay historial de conversación NI es meta-pregunta,
            # retornar el mensaje de falta de información.
            if not tiene_fragmentos_relevantes and not historial and not es_meta_pregunta:
                respuesta = f"No encontré información relevante en los documentos indexados para responder a: \"{pregunta}\"."
                fuentes = []
            else:
                try:
                    # Solo enviar historial si es meta-pregunta o tema nuevo
                    # Para seguimientos del mismo tema, NO enviar historial (evita confusión)
                    if es_meta_pregunta or es_cambio_tema:
                        historial_para_llm = [{"role": "user", "content": h["content"]} for h in historial if h["role"] == "user"][-4:]
                    else:
                        historial_para_llm = []
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

        # 6. Guardar mensajes en la base de datos vinculados a conversation.id
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

    def _formatear_respuesta_solo_embeddings(self, pregunta: str, fragmentos: List[Dict[str, Any]]) -> str:
        if not fragmentos:
            return f"No se encontró información relevante en los documentos para responder a: \"{pregunta}\"."

        top = fragmentos[0]
        if top.get("cos_score", 0) < 35.0 and top.get("hybrid_score", 0) < 36.0:
            return (
                f"No se encontró una coincidencia concluyente en las políticas y contratos indexados para: \"{pregunta}\".\n\n"
                f"Te sugerimos reformular los términos de búsqueda o consultar directamente con el área de Recursos Humanos."
            )

        lineas = [
            "INFORMACIÓN RECUPERADA EN LA DOCUMENTACIÓN INTERNA:\n"
        ]

        for frag in fragmentos[:2]:
            meta = frag.get("metadata", {})
            doc = meta.get("document_name", "Documento interno")
            pag = meta.get("page", 1)
            sec = meta.get("section", "")

            ubicacion = f"Pág. {pag}" if pag else ""
            if sec and sec != f"Página {pag}" and sec != "General":
                ubicacion += f" • {sec}" if ubicacion else sec

            # Extraer pasaje con fallback seguro
            pasaje = self._extraer_pasaje_clave(pregunta, frag["content"])
            if not pasaje or len(pasaje.strip()) < 20:
                pasaje = frag["content"].strip()

            lineas.append(f"**{doc}** ({ubicacion}):")
            lineas.append(f"> \"{pasaje}\"\n")

        lineas.append("*Respuesta extraída directamente mediante búsqueda semántica local (sin LLM).*")
        return "\n".join(lineas)
