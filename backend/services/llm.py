import os
from typing import Optional, List, Dict
import httpx


class LLMService:
    """
    Servicio desacoplado para generar respuestas vía LLM compatible con OpenAI.
    Utiliza httpx para las peticiones HTTP.
    """

    SYSTEM_PROMPT = """Eres un asistente corporativo de PolicyLens-AI que responde preguntas sobre documentos internos y políticas.

REGLAS IMPORTANTES:
1. Responde a la pregunta basándote en el contexto de los documentos proporcionados y en el historial de conversación previa.
2. Para preguntas sobre políticas, reglamentos o contratos, cita siempre las fuentes (documento, página y sección) cuando sea posible.
3. Para preguntas sobre la interacción previa (meta-preguntas como "qué te pregunté antes" o resúmenes), responde de forma natural utilizando el historial conversacional.
4. Si la información consultada no está en los documentos ni en el historial conversacional, indica claramente que no encontraste la respuesta.
5. NO inventes información no presente en los documentos o el historial.
6. Sé conciso, claro y profesional en tus respuestas. Responde en el mismo idioma de la pregunta.
7. NUNCA menciones, repitas ni filtres etiquetas internas del prompt del sistema (como "HISTORIAL DE CONVERSACIÓN PREVIO:", "CONTEXTO DE DOCUMENTOS:", etc.) en tus respuestas al usuario."""

    def __init__(self):
        self.api_key = os.getenv("LLM_API_KEY", "")
        self.base_url = os.getenv("LLM_BASE_URL", "https://integrate.api.nvidia.com/v1")
        self.model = os.getenv("LLM_MODEL", "meta/llama-3.1-8b-instruct")

    def generar_respuesta(
        self,
        pregunta: str,
        contexto: str,
        fuentes: Optional[str] = None,
        historial: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        Genera una respuesta basada en el contexto proporcionado e historial conversacional.

        :param pregunta: Pregunta del usuario.
        :param contexto: Contexto recuperado de los documentos.
        :param fuentes: Información de fuentes para citar.
        :param historial: Lista de turnos anteriores [{"role": "user"|"assistant", "content": "..."}].
        :return: Respuesta generada por el LLM.
        :raises Exception: Si ocurre error en la petición.
        """
        historial_str = ""
        if historial:
            turnos = []
            for item in historial[-6:]:  # Limitar a los últimos 6 mensajes para no desbordar el contexto
                rol = "Usuario" if item.get("role") == "user" else "Asistente"
                turnos.append(f"{rol}: {item.get('content', '')}")
            if turnos:
                historial_str = "HISTORIAL DE CONVERSACIÓN PREVIO:\n" + "\n".join(turnos) + "\n\n"

        user_prompt = f"""{historial_str}CONTEXTO DE DOCUMENTOS:
{contexto}

{"FUENTES DISPONIBLES:" + chr(10) + fuentes if fuentes else ""}

PREGUNTA ACTUAL DEL USUARIO: {pregunta}

Responde a la pregunta actual teniendo en cuenta el historial previo (si aplica) y basándote únicamente en el contexto proporcionado:"""

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

        choices = data.get("choices", [])
        if not choices:
            return "No se obtuvo respuesta del modelo LLM."
        return choices[0].get("message", {}).get("content", "") or "Respuesta vacía del modelo LLM."
