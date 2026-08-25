import os
from typing import List


class EmbeddingService:
    """
    Servicio desacoplado para generar embeddings 100% locales via sentence-transformers.

    Modelo configurable con EMBEDDING_MODEL_LOCAL (.env).
    Por defecto BAAI/bge-m3 (1024 dimensiones, ventana de 8192 tokens).

    Lazy loading: el modelo solo se instancia en la primera consulta.
    NOTA: al cambiar de modelo hay que regenerar el indice con:
        python -m backend.scripts.reindexar_todo
    (vectores de modelos distintos son dimensional/semanticamente incompatibles)
    """

    FALLBACK_MODEL = "BAAI/bge-m3"
    FALLBACK_DIM = 1024

    def __init__(self):
        self.model = os.getenv("EMBEDDING_MODEL_LOCAL", self.FALLBACK_MODEL)
        self._local_model = None

    def _get_local_model(self):
        """Lazy loading: instancia SentenceTransformer solo en la primera consulta."""
        if self._local_model is None:
            from sentence_transformers import SentenceTransformer
            self._local_model = SentenceTransformer(self.model)
        return self._local_model

    def generar_embedding(self, texto: str) -> List[float]:
        """
        Genera el vector de embedding de un texto.
        Si falla, propaga la excepcion para evitar indexar vectores nulos (silenciosos).
        """
        model = self._get_local_model()
        return model.encode(texto).tolist()

    def generar_embeddings_lote(self, textos: List[str]) -> List[List[float]]:
        """
        Genera un lote de vectores de embedding.
        Si falla, propaga la excepcion para evitar indexar vectores nulos (silenciosos).
        """
        model = self._get_local_model()
        return [e.tolist() for e in model.encode(textos)]
