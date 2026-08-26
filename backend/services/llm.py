import json
import os
from typing import Optional, List, Dict, Generator
import httpx
from dotenv import load_dotenv

load_dotenv()


class LLMService:
    """
    Servicio desacoplado para generar respuestas via LLM.
    Usa un proveedor compatible con OpenAI (Ollama local, OpenAI, etc.)
    """

    SYSTEM_PROMPT = """Eres PolicyLens AI, un asistente experto en documentos internos de la empresa. Tu trabajo es ayudar a los empleados a encontrar informacion precisa sobre politicas, contratos y reglamentos.

REGLAS FUNDAMENTALES:
1. Lee TODO el contexto proporcionado ANTES de responder.
2. Busca la respuesta EXACTA en el contexto. Si los datos estan ahi, citarlos directamente.
3. NUNCA digas "no se menciona" o "no encontré" si la informacion SI esta en el contexto.
4. Si la pregunta es sobre vacaciones, permisos, salarios, etc., busca numeros, porcentajes, dias, montos especificos en el contexto.
5. Si el empleado pide "mostrar el articulo", "mostrar la seccion", muestra el contenido relevante del contexto.
6. Si realmente no hay informacion en el contexto para responder, di EXACTAMENTE: "No encontré esa información en los documentos disponibles." y NADA MAS. No agregues recomendaciones, contactos, ni sugerencias adicionales.
7. Cita siempre: documento, pagina y seccion.
8. Responde en el mismo idioma de la pregunta.
9. Sé directo y preciso. No des vueltas. No inventes informacion que no este en el contexto."""

    def __init__(self):
        self.api_key = os.getenv("LLM_API_KEY", "")
        self.base_url = os.getenv("LLM_BASE_URL", "http://localhost:11434/v1")
        self.model = os.getenv("LLM_MODEL", "qwen2.5:3b")

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

        turnos = []
        for item in historial[-4:]:
            rol = "Empleado" if item.get("role") == "user" else "Asistente"
            turnos.append(f"{rol}: {item.get('content', '')[:180]}")

        historial_str = "\n".join(turnos)

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
        except Exception:
            pass

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
            "temperature": 0.1,
            "max_tokens": 1024,
            "stream": True
        }

        with httpx.Client(timeout=120.0) as client:
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
            turnos = []
            for item in historial[-6:]:
                rol = "Empleado" if item.get("role") == "user" else "Asistente"
                turnos.append(f"{rol}: {item.get('content', '')[:200]}")
            if turnos:
                historial_str = "HISTORIAL:\n" + "\n".join(turnos) + "\n\n"

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
            "temperature": 0.1,
            "max_tokens": 1024
        }

        with httpx.Client(timeout=120.0) as client:
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

