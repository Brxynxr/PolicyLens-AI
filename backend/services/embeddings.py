import os
from typing import List
import httpx


class EmbeddingService:
    """
    Servicio desacoplado para generar embeddings vía API compatible con OpenAI.
    Utiliza httpx para las peticiones HTTP.
    """

    def __init__(self):
        self.base_url = os.getenv("LLM_BASE_URL", "https://integrate.api.nvidia.com/v1")
        self.model = os.getenv("EMBEDDING_MODEL", "nvidia/nv-embedqa-e5-v5")
        self.api_key = os.getenv("LLM_API_KEY", "")

    def generar_embedding(self, texto: str) -> List[float]:
        """
        Genera un embedding para un texto dado.

        :param texto: Texto de entrada.
        :return: Vector de embedding como lista de floats.
        :raises Exception: Si ocurre error en la petición.
        """
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

    def generar_embeddings_lote(self, textos: List[str]) -> List[List[float]]:
        """
        Genera embeddings para una lista de textos.

        :param textos: Lista de textos de entrada.
        :return: Lista de vectores de embedding.
        :raises Exception: Si ocurre error en la petición.
        """
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
