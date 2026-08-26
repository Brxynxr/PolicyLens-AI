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

    FALLBACK_MODEL = "intfloat/multilingual-e5-base"
    FALLBACK_DIM = 768

    def __init__(self):
        self.model = os.getenv("EMBEDDING_MODEL_LOCAL", self.FALLBACK_MODEL)
        self._local_model = None

    def _get_local_model(self):
        """Lazy loading: instancia SentenceTransformer solo en la primera consulta."""
        if self._local_model is None:
            from sentence_transformers import SentenceTransformer
            self._local_model = SentenceTransformer(self.model)
            self._local_model.max_seq_length = 512
        return self._local_model

    @property
    def _is_e5_model(self) -> bool:
        return "e5" in self.model.lower()

    def generar_embedding(self, texto: str, is_query: bool = True) -> List[float]:
        """
        Genera el vector de embedding de un texto.
        Para modelos E5, aplica el prefijo 'query: ' o 'passage: ' según corresponda.
        """
        model = self._get_local_model()
        if self._is_e5_model:
            prefix = "query: " if is_query else "passage: "
            if not texto.startswith(("query: ", "passage: ")):
                texto = prefix + texto
        return model.encode(texto, normalize_embeddings=True).tolist()

    def generar_embeddings_lote(self, textos: List[str], is_query: bool = False) -> List[List[float]]:
        """
        Genera un lote de vectores de embedding con tamaño de lote optimizado.
        Para modelos E5, aplica el prefijo 'passage: ' o 'query: ' según corresponda.
        """
        model = self._get_local_model()
        if self._is_e5_model:
            prefix = "passage: " if not is_query else "query: "
            textos_preparados = [
                t if t.startswith(("query: ", "passage: ")) else prefix + t
                for t in textos
            ]
        else:
            textos_preparados = textos

        return [e.tolist() for e in model.encode(textos_preparados, batch_size=32, normalize_embeddings=True)]
