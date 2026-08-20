import os
from typing import List
import httpx


class EmbeddingService:
    """
    Servicio desacoplado para generar embeddings.
    Soporta dos modos: API (NVIDIA NIM) y Local (sentence-transformers).
    """

    def __init__(self):
        self.base_url = os.getenv("LLM_BASE_URL", "https://integrate.api.nvidia.com/v1")
        self.model = os.getenv("EMBEDDING_MODEL", "nvidia/nv-embedqa-e5-v5")
        self.api_key = os.getenv("LLM_API_KEY", "")
        self._local_model = None

    def _get_local_model(self):
        if self._local_model is None:
            from sentence_transformers import SentenceTransformer
            self._local_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        return self._local_model

    def generar_embedding(self, texto: str, local: bool = False) -> List[float]:
        if local:
            return self._generar_embedding_local(texto)
        return self._generar_embedding_api(texto)

    def generar_embeddings_lote(self, textos: List[str], local: bool = False) -> List[List[float]]:
        if local:
            return self._generar_embeddings_lote_local(textos)
        return self._generar_embeddings_lote_api(textos)

    def _generar_embedding_local(self, texto: str) -> List[float]:
        model = self._get_local_model()
        embedding = model.encode(texto)
        return embedding.tolist()

    def _generar_embeddings_lote_local(self, textos: List[str]) -> List[List[float]]:
        model = self._get_local_model()
        embeddings = model.encode(textos)
        return [e.tolist() for e in embeddings]

    def _generar_embedding_api(self, texto: str) -> List[float]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "input": texto,
            "input_type": "query",
            "encoding_format": "float"
        }
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                f"{self.base_url}/embeddings",
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            data = response.json()
        return data["data"][0]["embedding"]

    def _generar_embeddings_lote_api(self, textos: List[str]) -> List[List[float]]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "input": textos,
            "input_type": "passage",
            "encoding_format": "float"
        }
        with httpx.Client(timeout=60.0) as client:
            response = client.post(
                f"{self.base_url}/embeddings",
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            data = response.json()
        return [item["embedding"] for item in data["data"]]
