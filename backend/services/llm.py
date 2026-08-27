import json
import logging
import os
from typing import Optional, List, Dict, Generator
import httpx
from dotenv import load_dotenv

logger = logging.getLogger("policylens.llm")

load_dotenv()


class LLMService:
    """
    Servicio desacoplado para generar respuestas via LLM.
    Usa un proveedor compatible con OpenAI (Ollama local, OpenAI, etc.)
    """

    SYSTEM_PROMPT = """Eres PolicyLens AI, el asistente oficial de normativas, contratos y políticas internas.

Instrucciones de precisión:
1. Responde directamente la duda central en la primera oración basándote ÚNICAMENTE en el contexto documental proporcionado.
2. Si la respuesta contiene requisitos, plazos, condiciones o artículos normativos, preséntalos en una lista con viñetas: • **Concepto clave**: Explicación concisa.
3. Si la información solicitada no aparece en los documentos, responde exactamente: "No encontré esa información en los documentos disponibles."
4. Responde siempre en español profesional."""



    def __init__(self):
        self.api_key = os.getenv("LLM_API_KEY", "")
        self.base_url = os.getenv("LLM_BASE_URL", "http://localhost:11434/v1")
        self.model = os.getenv("LLM_MODEL", "phi4-mini")

    @staticmethod
    def _formatear_historial(historial: List[Dict[str, str]], max_turnos: int = 4, max_chars_por_turno: int = 1000) -> str:
        """
        Formatea el historial de turnos conversacionales preservando el contenido completo
        y evitando cortes abruptos a mitad de palabras o números.
        """
        if not historial:
            return ""

        turnos = []
        for item in historial[-max_turnos:]:
            rol = "Empleado" if item.get("role") == "user" else "Asistente"
            contenido = (item.get("content") or "").strip()
            if not contenido:
                continue

            if len(contenido) > max_chars_por_turno:
                recorte = contenido[:max_chars_por_turno]
                if " " in recorte:
                    contenido = recorte.rsplit(" ", 1)[0] + "..."
                else:
                    contenido = recorte + "..."

            turnos.append(f"{rol}: {contenido}")

        return "\n".join(turnos)

    def reescribir_query_contextual(
        self,
        pregunta: str,
        historial: List[Dict[str, str]]
    ) -> str:
        """
        Reformula una pregunta dependiente o elíptica usando el historial conversacional
        para generar una consulta de búsqueda semántica autocontenida y precisa.
        """
        if not historial:
            return pregunta

        historial_str = self._formatear_historial(historial, max_turnos=4, max_chars_por_turno=1000)
        if not historial_str:
            return pregunta

        prompt_reescritura = (
            f"HISTORIAL DE CONVERSACIÓN RECIENTE:\n{historial_str}\n\n"
            f"NUEVA PREGUNTA DE SEGUIMIENTO DEL EMPLEADO: \"{pregunta}\"\n\n"
            f"INSTRUCCIÓN:\n"
            f"Reformula la nueva pregunta en una sola frase de búsqueda autocontenida que combine el tema de la conversación con la nueva duda del empleado para buscar en las políticas y reglamentos de la empresa.\n"
            f"Responde ÚNICAMENTE con la consulta reformulada (una sola línea, sin comillas ni explicaciones)."
        )

        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "Eres un optimizador de consultas de búsqueda documental. Responde exclusivamente con la frase reformulada."
                },
                {"role": "user", "content": prompt_reescritura}
            ],
            "temperature": 0.0,
            "max_tokens": 50
        }

        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload
                )
                if resp.status_code == 200:
                    data = resp.json()
                    choices = data.get("choices", [])
                    if choices:
                        texto = choices[0].get("message", {}).get("content", "").strip()
                        texto = texto.strip('"\n\r ')
                        if texto and len(texto) >= 5:
                            return texto
        except Exception as e:
            logger.warning(f"Error al reescribir consulta con LLM: {e}. Se usará la pregunta original.")

        return pregunta

    def generar_respuesta(
        self,
        pregunta: str,
        contexto: str,
        fuentes: Optional[str] = None,
        historial: Optional[List[Dict[str, str]]] = None
    ) -> str:
        return self._generar_api(pregunta, contexto, fuentes, historial)

    def generar_respuesta_stream(
        self,
        pregunta: str,
        contexto: str,
        fuentes: Optional[str] = None,
        historial: Optional[List[Dict[str, str]]] = None
    ) -> Generator[str, None, None]:
        """
        Generador que consume la API del LLM en modo streaming y emite cada fragmento (delta) de texto.
        """
        prompt = self._construir_prompt(pregunta, contexto, fuentes, historial)

        headers = {
            "Content-Type": "application/json"
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.0,
            "max_tokens": 1024,
            "stream": True
        }

        with httpx.Client(timeout=180.0) as client:
            with client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload
            ) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    line = line.strip()
                    if not line:
                        continue
                    if line.startswith("data: "):
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            chunk_data = json.loads(data_str)
                            choices = chunk_data.get("choices", [])
                            if choices:
                                delta = choices[0].get("delta", {})
                                content = delta.get("content")
                                if content:
                                    yield content
                        except Exception:
                            continue

    def _construir_prompt(self, pregunta: str, contexto: str, fuentes: Optional[str], historial: Optional[List[Dict[str, str]]]) -> str:
        historial_str = ""
        if historial:
            formatted = self._formatear_historial(historial, max_turnos=4, max_chars_por_turno=1000)
            if formatted:
                historial_str = f"HISTORIAL PREVIO DE LA CONVERSACIÓN:\n{formatted}\n\n"

        return f"""{historial_str}CONTEXTO DE LOS DOCUMENTOS INTERNOS:
---
{contexto}
---

FUENTES: {fuentes if fuentes else "N/A"}

PREGUNTA DEL EMPLEADO: {pregunta}

INSTRUCCION: Si la pregunta es un seguimiento, usa el historial para entender el contexto. Busca la respuesta EXACTA en el contexto. Si los datos estan ahi, citarlos directamente. Si realmente no esta, indica que no encontraste la informacion en los documentos disponibles."""

    def _generar_api(self, pregunta: str, contexto: str, fuentes: Optional[str], historial: Optional[List[Dict[str, str]]]) -> str:
        prompt = self._construir_prompt(pregunta, contexto, fuentes, historial)

        headers = {
            "Content-Type": "application/json"
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.0,
            "max_tokens": 1024
        }



        with httpx.Client(timeout=180.0) as client:
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

