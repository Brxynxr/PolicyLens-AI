import os
import re
from typing import List, Dict, Any, Optional
import chromadb
from sqlalchemy.orm import Session

from backend.services.embeddings import EmbeddingService
from backend.services.llm import LLMService
from backend.models.conversation import Conversation, Message

STOPWORDS_ES = {
    'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un',
    'para', 'con', 'no', 'una', 'su', 'al', 'lo', 'como', 'más', 'pero', 'sus', 'le',
    'ya', 'o', 'este', 'sí', 'porque', 'esta', 'son', 'entre', 'está', 'cuando', 'muy',
    'sin', 'sobre', 'también', 'me', 'hasta', 'hay', 'donde', 'quien', 'desde', 'todo',
    'nos', 'durante', 'todos', 'uno', 'les', 'ni', 'contra', 'otros', 'ese', 'eso',
    'ante', 'ellos', 'e', 'esto', 'mí', 'antes', 'algunos', 'qué', 'cuál', 'cuáles',
    'cuántos', 'cuánto', 'cuánta', 'cuántas', 'tiene', 'tengo', 'es', 'son', 'días', 'cómo'
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
        bloques = [b.strip() for b in contenido.split('\n\n') if b.strip()]
        if not bloques:
            return contenido

        palabras = set(re.findall(r'\b\w+\b', pregunta.lower())) - STOPWORDS_ES
        if not palabras:
            return '\n\n'.join(bloques[:2])

        bloques_puntuados = []
        for b in bloques:
            b_lower = b.lower()
            coincidencias = sum(1 for p in palabras if p in b_lower)
            score = coincidencias / max(1, len(palabras))
            if any(h in b_lower for h in ['sección', 'cláusula', 'artículo', 'política', 'derecho', 'vigencia', 'vacaciones', 'teletrabajo']):
                score += 0.25
            bloques_puntuados.append((score, b))

        bloques_puntuados.sort(key=lambda x: x[0], reverse=True)
        mejores = [b for s, b in bloques_puntuados if s > 0.15][:2]
        return '\n\n'.join(mejores) if mejores else '\n\n'.join(bloques[:2])

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

        # 2. Cargar historial previo de la conversación y obtener el último mensaje del usuario
        historial = []
        ultimo_mensaje_usuario = ""
        if conversation.messages:
            for msg in conversation.messages:
                historial.append({
                    "role": msg.role,
                    "content": msg.content
                })
                if msg.role == "user":
                    ultimo_mensaje_usuario = msg.content

        # Detectar si la pregunta actual es una meta-pregunta conversacional o un seguimiento contextual
        pregunta_lower = pregunta.lower()
        es_meta_pregunta = any(kw in pregunta_lower for kw in [
            "primera pregunta", "primer tema", "qué te pregunté", "te pregunté", "te dije",
            "qué dijimos", "de qué hablabamos", "de qué hablamos", "resumen", "conversado",
            "anteriormente", "historial", "conversación"
        ])

        query_busqueda = pregunta
        es_pregunta_corta_o_seguimiento = (
            len(pregunta.split()) < 12 or 
            any(kw in pregunta_lower for kw in ["y si", "y para", "y en", "cuántos", "cuál", "cuáles", "esto", "eso", "llevo", "años", "sobre", "anterior", "mismo", "mismas"])
        )
        if historial and ultimo_mensaje_usuario and es_pregunta_corta_o_seguimiento and not es_meta_pregunta:
            query_busqueda = f"{ultimo_mensaje_usuario} {pregunta}"

        # 3. Buscar fragmentos relevantes en la base vectorial con la consulta expandida
        fragmentos = self.buscar_fragmentos(query_busqueda, top_k=12, local=True)

        # 4. Calcular scores combinados (semántico + léxico)
        palabras_pregunta = set(re.findall(r'\b\w+\b', pregunta.lower())) - STOPWORDS_ES
        for frag in fragmentos:
            cos_sim = round((1 - frag["distance"]) * 100, 1)
            texto_lower = frag["content"].lower()
            lex_score = sum(1 for p in palabras_pregunta if p in texto_lower) / max(1, len(palabras_pregunta))
            frag["hybrid_score"] = (cos_sim * 0.7) + (lex_score * 30.0)
            frag["cos_score"] = cos_sim

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

            # Deduplicar por documento, quedarse con el chunk de mayor score
            seen_docs = set()
            fragmentos_relevantes = []
            for f in fragmentos_relevantes_raw:
                doc_name = f["metadata"].get("document_name", "")
                if doc_name not in seen_docs:
                    seen_docs.add(doc_name)
                    fragmentos_relevantes.append(f)
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
                    respuesta = self.llm_service.generar_respuesta(
                        pregunta=pregunta,
                        contexto=contexto if tiene_fragmentos_relevantes else "",
                        fuentes=fuentes_str if tiene_fragmentos_relevantes else None,
                        historial=historial
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
            f"📋 **Información recuperada en la documentación interna:**\n"
        ]

        # Tomar los 2 fragmentos más relevantes
        for frag in fragmentos[:2]:
            meta = frag.get("metadata", {})
            doc = meta.get("document_name", "Documento interno")
            pag = meta.get("page", 1)
            sec = meta.get("section", "")

            ubicacion = f"Pág. {pag}" if pag else ""
            if sec and sec != f"Página {pag}" and sec != "General":
                ubicacion += f" • {sec}"

            pasaje = self._extraer_pasaje_clave(pregunta, frag["content"])

            lineas.append(f"📌 **{doc}** ({ubicacion}):")
            lineas.append(f"{pasaje}\n")

        lineas.append("🔍 *Respuesta extraída directamente mediante búsqueda semántica local (sin LLM).*")
        return "\n".join(lineas)
