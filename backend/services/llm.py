import os
from typing import Optional, List, Dict
import httpx


class LLMService:
    """
    Servicio desacoplado para generar respuestas via LLM.
    Usa un proveedor externo compatible con OpenAI (NVIDIA NIM, OpenAI, etc.)
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
        self.base_url = os.getenv("LLM_BASE_URL", "https://integrate.api.nvidia.com/v1")
        self.model = os.getenv("LLM_MODEL", "meta/llama-3.1-8b-instruct")

    def generar_respuesta(
        self,
        pregunta: str,
        contexto: str,
        fuentes: Optional[str] = None,
        historial: Optional[List[Dict[str, str]]] = None
    ) -> str:
        return self._generar_api(pregunta, contexto, fuentes, historial)

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
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.1,
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
