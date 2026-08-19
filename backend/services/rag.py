import os
from typing import List, Dict, Any, Optional
import chromadb
from sqlalchemy.orm import Session

from backend.services.embeddings import EmbeddingService
from backend.services.llm import LLMService
from backend.models.conversation import Conversation, Message


class RAGService:
    """
    Servicio de orquestación RAG (Retrieval-Augmented Generation).
    Coordina embeddings, ChromaDB y LLM para responder preguntas.
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

        # Inicializar ChromaDB con persistencia en ./chroma_data/
        chroma_path = os.path.join(os.path.dirname(__file__), "../../chroma_data")
        os.makedirs(chroma_path, exist_ok=True)
        self.chroma_client = chromadb.PersistentClient(path=chroma_path)

        # Obtener o crear colección
        self.collection = self.chroma_client.get_or_create_collection(
            name="documents",
            metadata={"hnsw:space": "cosine"}
        )

    def indexar_documento(self, chunks: List[Dict[str, Any]]) -> None:
        """
        Indexa los chunks de un documento en ChromaDB.

        :param chunks: Lista de diccionarios con metadata y contenido.
        """
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

        # Generar embeddings para todos los chunks
        embeddings = self.embedding_service.generar_embeddings_lote(documents)

        # Agregar a ChromaDB
        self.collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas
        )

    def eliminar_documento(self, document_id: int) -> None:
        """
        Elimina todos los chunks de un documento de ChromaDB.

        :param document_id: ID del documento a eliminar.
        """
        # Obtener todos los IDs del documento
        results = self.collection.get(
            where={"document_id": document_id}
        )

        if results["ids"]:
            self.collection.delete(ids=results["ids"])

    def buscar_fragmentos(self, pregunta: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Busca los fragmentos más relevantes para una pregunta.

        :param pregunta: Pregunta del usuario.
        :param top_k: Número de resultados a retornar.
        :return: Lista de fragmentos con metadata.
        """
        # Generar embedding de la pregunta
        pregunta_embedding = self.embedding_service.generar_embedding(pregunta)

        # Buscar en ChromaDB
        results = self.collection.query(
            query_embeddings=[pregunta_embedding],
            n_results=top_k
        )

        fragmentos = []
        if results["documents"] and results["documents"][0]:
            for i, doc in enumerate(results["documents"][0]):
                fragmentos.append({
                    "content": doc,
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                    "distance": results["distances"][0][i] if results["distances"] else 0
                })

        return fragmentos

    def preguntar(self, pregunta: str, db: Session) -> Dict[str, Any]:
        """
        Orquesta el flujo completo RAG: buscar contexto, generar respuesta y guardar en BD.

        :param pregunta: Pregunta del usuario.
        :param db: Sesión de base de datos.
        :return: Diccionario con respuesta y fuentes.
        """
        # 1. Buscar fragmentos relevantes
        fragmentos = self.buscar_fragmentos(pregunta, top_k=5)

        # 2. Construir contexto y fuentes
        contexto_parts = []
        fuentes = []

        if fragmentos:
            for frag in fragmentos:
                meta = frag["metadata"]
                contexto_parts.append(f"[{meta.get('document_name', 'Doc')}, página {meta.get('page', '?')}]: {frag['content']}")
                fuentes.append({
                    "document": meta.get("document_name", "Desconocido"),
                    "page": meta.get("page", 1),
                    "section": meta.get("section", "General"),
                    "content": frag["content"][:500]  # Limitar tamaño
                })

        contexto = "\n\n".join(contexto_parts)
        fuentes_str = "\n".join([f"- {f['document']}, p.{f['page']}" for f in fuentes])

        # 3. Generar respuesta con LLM
        if not fragmentos:
            respuesta = "No encontré información relevante en los documentos para responder tu pregunta."
        else:
            try:
                respuesta = self.llm_service.generar_respuesta(pregunta, contexto, fuentes_str)
            except Exception as e:
                respuesta = f"Error al generar la respuesta: {str(e)}"

        # 4. Guardar conversación en BD (siempre)
        conversation = Conversation()
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

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
