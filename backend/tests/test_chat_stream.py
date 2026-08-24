import json
import os
import sys
import tempfile
import unittest
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

os.environ["CHROMA_PATH"] = tempfile.mkdtemp(prefix="chroma_test_stream_")

from backend.database import Base, get_db
from backend.main import app

TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


class TestChatStream(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=test_engine)
        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        Base.metadata.drop_all(bind=test_engine)

    def setUp(self):
        self.patcher_embedding = patch("backend.services.embeddings.EmbeddingService.generar_embedding", return_value=[0.1] * 384)
        self.patcher_embeddings_lote = patch("backend.services.embeddings.EmbeddingService.generar_embeddings_lote", side_effect=lambda textos, **kwargs: [[0.1] * 384 for _ in textos])
        self.mock_embedding = self.patcher_embedding.start()
        self.mock_embeddings_lote = self.patcher_embeddings_lote.start()
        self.db = TestingSessionLocal()

    def tearDown(self):
        self.patcher_embedding.stop()
        self.patcher_embeddings_lote.stop()
        self.db.rollback()
        self.db.close()

    def _parse_sse_events(self, response_text: str):
        events = []
        for block in response_text.split("\n\n"):
            block = block.strip()
            if not block:
                continue
            for line in block.split("\n"):
                if line.startswith("data: "):
                    data_str = line[6:].strip()
                    events.append(json.loads(data_str))
        return events

    def test_chat_stream_empty_question(self):
        """Verifica que una pregunta vacía retorne error 400."""
        response = self.client.post("/chat/stream", json={"question": "   ", "mode": "rag"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("La pregunta no puede estar vacía", response.json()["detail"])

    def test_chat_stream_rag_mode(self):
        """Verifica el flujo de streaming SSE en modo RAG con generación de tokens."""
        mock_tokens = ["De acuerdo con el manual, ", "tienes 15 días ", "de vacaciones hábiles."]
        mock_fragmentos = [{
            "content": "Los empleados tienen derecho a 15 días de vacaciones por año.",
            "metadata": {"document_name": "manual_rrhh.pdf", "page": 5, "section": "Vacaciones"},
            "distance": 0.05
        }]

        def mock_stream(*args, **kwargs):
            for t in mock_tokens:
                yield t

        with patch("backend.services.rag.RAGService.buscar_fragmentos", return_value=mock_fragmentos), \
             patch("backend.services.llm.LLMService.generar_respuesta_stream", side_effect=mock_stream):
            response = self.client.post(
                "/chat/stream",
                json={"question": "¿Cuántos días de vacaciones tengo?", "mode": "rag"}
            )
            self.assertEqual(response.status_code, 200)
            self.assertIn("text/event-stream", response.headers["content-type"])

            events = self._parse_sse_events(response.text)
            self.assertGreaterEqual(len(events), 3)

            # Primer evento: start
            start_event = events[0]
            self.assertEqual(start_event["type"], "start")
            self.assertIn("conversation_id", start_event)
            self.assertIn("sources", start_event)
            self.assertEqual(len(start_event["sources"]), 1)

            # Eventos token intermedios
            token_events = [e for e in events if e["type"] == "token"]
            self.assertGreaterEqual(len(token_events), 1)
            token_content = "".join([e["content"] for e in token_events])
            self.assertEqual(token_content, "".join(mock_tokens))

            # Evento final: done
            done_event = events[-1]
            self.assertEqual(done_event["type"], "done")
            self.assertEqual(done_event["conversation_id"], start_event["conversation_id"])
            self.assertEqual(done_event["answer"], "".join(mock_tokens))

    def test_chat_stream_search_mode(self):
        """Verifica el flujo de streaming SSE en modo Solo Embeddings (Search)."""
        mock_fragmentos = [{
            "content": "El uso de contraseñas seguras es obligatorio en todos los equipos.",
            "metadata": {"document_name": "politica_seguridad.html", "page": 1, "section": "Seguridad"},
            "distance": 0.05
        }]
        with patch("backend.services.rag.RAGService.buscar_fragmentos", return_value=mock_fragmentos):
            response = self.client.post(
                "/chat/stream",
                json={"question": "¿Cuál es la política de seguridad?", "mode": "search"}
            )
            self.assertEqual(response.status_code, 200)
            events = self._parse_sse_events(response.text)

            self.assertGreaterEqual(len(events), 3)
            self.assertEqual(events[0]["type"], "start")
            self.assertEqual(events[1]["type"], "token")
            self.assertEqual(events[-1]["type"], "done")

    def test_chat_stream_conversation_continuity(self):
        """Verifica que el conversation_id se mantenga y que los mensajes se persistan en BD."""
        mock_tokens1 = ["Primer mensaje."]
        mock_tokens2 = ["Segundo mensaje consecutivo."]
        mock_fragmentos = [{
            "content": "Contenido de soporte para la pregunta.",
            "metadata": {"document_name": "manual.pdf", "page": 1, "section": "General"},
            "distance": 0.05
        }]

        with patch("backend.services.rag.RAGService.buscar_fragmentos", return_value=mock_fragmentos), \
             patch("backend.services.llm.LLMService.generar_respuesta_stream", side_effect=[mock_tokens1, mock_tokens2]):
            res1 = self.client.post("/chat/stream", json={"question": "Pregunta 1", "mode": "rag"})
            events1 = self._parse_sse_events(res1.text)
            conv_id = events1[0]["conversation_id"]

            res2 = self.client.post("/chat/stream", json={"question": "Pregunta 2", "conversation_id": conv_id, "mode": "rag"})
            events2 = self._parse_sse_events(res2.text)
            self.assertEqual(events2[0]["conversation_id"], conv_id)

            # Verificar persistencia en endpoint de conversaciones
            res_conv = self.client.get(f"/chat/conversations/{conv_id}")
            self.assertEqual(res_conv.status_code, 200)
            conv_data = res_conv.json()
            self.assertEqual(len(conv_data["messages"]), 4)


if __name__ == "__main__":
    unittest.main()
