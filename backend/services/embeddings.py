import logging
import os
from typing import List
import httpx

logger = logging.getLogger("policylens.embeddings")


class EmbeddingService:
    """
    Servicio para generación de embeddings locales a través de Ollama.
    Utiliza el modelo qwen3-embedding:0.6b (1024 dimensiones, 32k ventana de contexto).
    """

    DEFAULT_MODEL = "qwen3-embedding:0.6b"
    INSTRUCTION_QWEN = "Instruct: Dado un requerimiento normativo, recupera los artículos y políticas pertinentes\nQuery: "

    def __init__(self):
        self.model = os.getenv("EMBEDDING_MODEL", os.getenv("EMBEDDING_MODEL_LOCAL", self.DEFAULT_MODEL))
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", os.getenv("LLM_BASE_URL", "http://localhost:11434"))
        if self.ollama_base_url.endswith("/v1"):
            self.ollama_base_url = self.ollama_base_url[:-3]

    def _preparar_texto(self, texto: str, is_query: bool) -> str:
        """Aplica prefijo de instrucción semántica a la consulta."""
        if is_query and not texto.startswith("Instruct:"):
            return f"{self.INSTRUCTION_QWEN}{texto}"
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
            logger.error(f"Fallo en llamada de embedding a Ollama ({url}): {e}")
            raise RuntimeError(f"Error al conectar con Ollama para embeddings: {str(e)}")

    def generar_embedding(self, texto: str, is_query: bool = True) -> List[float]:
        """
        Genera el vector de embedding para un texto individual.
        """
        texto_prep = self._preparar_texto(texto, is_query)
        vecs = self._generar_embedding_ollama([texto_prep])
        if not vecs:
            raise RuntimeError("Ollama no devolvió ningún vector de embedding.")
        return vecs[0]

    def generar_embeddings_lote(self, textos: List[str], is_query: bool = False) -> List[List[float]]:
        """
        Genera un lote de vectores de embedding de forma optimizada en sub-lotes pequeños (16).
        """
        if not textos:
            return []

        textos_preparados = [self._preparar_texto(t, is_query) for t in textos]
        lote_embeddings: List[List[float]] = []
        sub_lote_size = 16
        for i in range(0, len(textos_preparados), sub_lote_size):
            sub = textos_preparados[i:i + sub_lote_size]
            res = self._generar_embedding_ollama(sub)
            lote_embeddings.extend(res)
        return lote_embeddings



