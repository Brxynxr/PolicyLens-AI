import logging
import os
from typing import List, Optional
import httpx

logger = logging.getLogger("policylens.embeddings")


class EmbeddingService:
    """
    Servicio desacoplado para generación de embeddings.
    Soporta:
    1. Ollama local (ej: qwen3-embedding:0.6b) con contexto de 32k y 1024D.
    2. Modelos locales via sentence-transformers (ej: intfloat/multilingual-e5-base).
    """

    DEFAULT_MODEL = "qwen3-embedding:0.6b"
    INSTRUCTION_QWEN = "Instruct: Dado un requerimiento normativo, recupera los artículos y políticas pertinentes\nQuery: "

    def __init__(self):
        self.model = os.getenv("EMBEDDING_MODEL", os.getenv("EMBEDDING_MODEL_LOCAL", self.DEFAULT_MODEL))
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", os.getenv("LLM_BASE_URL", "http://localhost:11434"))
        if self.ollama_base_url.endswith("/v1"):
            self.ollama_base_url = self.ollama_base_url[:-3]

        self._local_model = None
        self._is_ollama = self._detectar_proveedor_ollama()

    def _detectar_proveedor_ollama(self) -> bool:
        """Determina si el modelo debe servirse a través del endpoint de Ollama."""
        nombre = self.model.lower()
        return ":" in nombre or "qwen3" in nombre or "ollama" in os.getenv("EMBEDDING_PROVIDER", "").lower()

    FALLBACK_MODEL = "intfloat/multilingual-e5-base"

    def _get_local_model(self):
        """Lazy loading: instancia SentenceTransformer solo cuando no se usa Ollama."""
        if self._local_model is None:
            from sentence_transformers import SentenceTransformer
            modelo_hf = self.model if not (":" in self.model or "qwen3" in self.model) else self.FALLBACK_MODEL
            self._local_model = SentenceTransformer(modelo_hf)
            self._local_model.max_seq_length = 512
        return self._local_model

    @property
    def _is_e5_model(self) -> bool:
        return "e5" in self.model.lower()

    @property
    def _is_qwen_model(self) -> bool:
        return "qwen" in self.model.lower()

    def _preparar_texto(self, texto: str, is_query: bool) -> str:
        """Aplica prefijos de instrucción según la familia del modelo."""
        if self._is_qwen_model:
            if is_query and not texto.startswith("Instruct:"):
                return f"{self.INSTRUCTION_QWEN}{texto}"
            return texto
        elif self._is_e5_model:
            prefix = "query: " if is_query else "passage: "
            if not texto.startswith(("query: ", "passage: ")):
                return prefix + texto
        return texto

    def _generar_embedding_ollama(self, textos: List[str]) -> List[List[float]]:
        """Llama al endpoint /api/embed de Ollama."""
        url = f"{self.ollama_base_url}/api/embed"
        payload = {
            "model": self.model,
            "input": textos
        }
        try:
            with httpx.Client(timeout=180.0) as client:
                resp = client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("embeddings", [])
                else:
                    logger.error(f"Error en Ollama embed API ({resp.status_code}): {resp.text}")
                    raise RuntimeError(f"Ollama embedding error: {resp.text}")
        except Exception as e:
            logger.warning(f"Fallo en llamada de embedding a Ollama: {e}. Intentando fallback local...")
            # Fallback a sentence-transformers si Ollama no responde
            model = self._get_local_model()
            return [e.tolist() for e in model.encode(textos, normalize_embeddings=True)]

    def generar_embedding(self, texto: str, is_query: bool = True) -> List[float]:
        """
        Genera el vector de embedding para un texto individual.
        """
        texto_prep = self._preparar_texto(texto, is_query)

        if self._is_ollama:
            vecs = self._generar_embedding_ollama([texto_prep])
            if vecs:
                return vecs[0]

        model = self._get_local_model()
        return model.encode(texto_prep, normalize_embeddings=True).tolist()

    def generar_embeddings_lote(self, textos: List[str], is_query: bool = False) -> List[List[float]]:
        """
        Genera un lote de vectores de embedding de forma optimizada en sub-lotes pequeños (16).
        """
        if not textos:
            return []

        textos_preparados = [self._preparar_texto(t, is_query) for t in textos]

        if self._is_ollama:
            # Procesar en sub-lotes de 16 para evitar timeouts y procesar con rapidez fluida
            lote_embeddings: List[List[float]] = []
            sub_lote_size = 16
            for i in range(0, len(textos_preparados), sub_lote_size):
                sub = textos_preparados[i:i + sub_lote_size]
                res = self._generar_embedding_ollama(sub)
                lote_embeddings.extend(res)
            return lote_embeddings

        model = self._get_local_model()
        return [e.tolist() for e in model.encode(textos_preparados, batch_size=16, normalize_embeddings=True)]


