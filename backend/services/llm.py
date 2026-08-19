import os
from typing import Optional
import httpx


class LLMService:
    """
    Servicio desacoplado para generar respuestas vía LLM compatible con OpenAI.
    Utiliza httpx para las peticiones HTTP.
    """

    SYSTEM_PROMPT = """Eres un asistente de una empresa que responde preguntas sobre documentos internos.

REGLAS IMPORTANTES:
1. Responde SOLO basándote en el contexto proporcionado.
2. NO inventes información que no esté en el contexto.
3. Si la información no está en los documentos, indica claramente que no encontraste la respuesta.
4. Cita siempre la fuente: documento, página y sección cuando sea posible.
5. Sé conciso y claro en tus respuestas.
6. Responde en el mismo idioma de la pregunta."""

    def __init__(self):
        self.api_key = os.getenv("LLM_API_KEY", "")
        self.base_url = os.getenv("LLM_BASE_URL", "https://integrate.api.nvidia.com/v1")
        self.model = os.getenv("LLM_MODEL", "meta/llama-3.1-8b-instruct")

    def generar_respuesta(self, pregunta: str, contexto: str, fuentes: Optional[str] = None) -> str:
        """
        Genera una respuesta basada en el contexto proporcionado.

        :param pregunta: Pregunta del usuario.
        :param contexto: Contexto recuperado de los documentos.
        :param fuentes: Información de fuentes para citar.
        :return: Respuesta generada por el LLM.
        :raises Exception: Si ocurre error en la petición.
        """
        user_prompt = f"""CONTEXTO DE DOCUMENTOS:
{contexto}

{"FUENTES DISPONIBLES:" + chr(10) + fuentes if fuentes else ""}

PREGUNTA DEL USUARIO: {pregunta}

Responde basándote únicamente en el contexto proporcionado:"""

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.3,
            "max_tokens": 1024
        }

        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            data = response.json()

        return data["choices"][0]["message"]["content"]
