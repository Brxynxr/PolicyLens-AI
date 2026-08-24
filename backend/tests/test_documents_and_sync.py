import os
import sys
import io
import shutil
import tempfile
import unittest
from unittest.mock import patch
import fitz  # PyMuPDF
import docx
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

# Aislar ChromaDB ANTES de importar backend.main: los tests usan embeddings mock
# de 384d y una consulta contra la coleccion productiva (1024d) dispararia
# _reset_coleccion() por conflicto de dimensiones, destruyendo el indice real.
os.environ["CHROMA_PATH"] = tempfile.mkdtemp(prefix="chroma_test_")

from backend.database import Base, get_db
from backend.main import app
from backend.utils.html import extraer_texto_html
from backend.routers import documents as docs_router_mod
from backend.routers import sync as sync_router_mod

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


class TestDocumentsAndSync(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=test_engine)
        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        Base.metadata.drop_all(bind=test_engine)

    def setUp(self):
        self.patcher_indexar = patch("backend.services.rag.RAGService.indexar_documento", return_value=None)
        self.patcher_eliminar = patch("backend.services.rag.RAGService.eliminar_documento", return_value=None)
        self.patcher_embedding = patch("backend.services.embeddings.EmbeddingService.generar_embedding", return_value=[0.1] * 384)
        self.patcher_embeddings_lote = patch("backend.services.embeddings.EmbeddingService.generar_embeddings_lote", side_effect=lambda textos, **kwargs: [[0.1] * 384 for _ in textos])

        self.mock_indexar = self.patcher_indexar.start()
        self.mock_eliminar = self.patcher_eliminar.start()
        self.mock_embedding = self.patcher_embedding.start()
        self.mock_embeddings_lote = self.patcher_embeddings_lote.start()

        self.temp_dir = tempfile.mkdtemp()
        self.old_docs_dir_1 = docs_router_mod.DOCUMENTS_DIR
        self.old_docs_dir_2 = sync_router_mod.DOCUMENTS_DIR
        docs_router_mod.DOCUMENTS_DIR = self.temp_dir
        sync_router_mod.DOCUMENTS_DIR = self.temp_dir
        self.db = TestingSessionLocal()

    def tearDown(self):
        self.patcher_indexar.stop()
        self.patcher_eliminar.stop()
        self.patcher_embedding.stop()
        self.patcher_embeddings_lote.stop()

        docs_router_mod.DOCUMENTS_DIR = self.old_docs_dir_1
        sync_router_mod.DOCUMENTS_DIR = self.old_docs_dir_2
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
        try:
            self.db.query(Document).delete()
            self.db.commit()
        except Exception:
            self.db.rollback()
        self.db.close()

    def _generar_pdf_bytes(self, contenido: str) -> bytes:
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((50, 50), contenido)
        pdf_bytes = doc.tobytes()
        doc.close()
        return pdf_bytes

    def _generar_docx_bytes(self, contenido: str) -> bytes:
        doc = docx.Document()
        doc.add_paragraph(contenido)
        buffer = io.BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        return buffer.read()

    def _generar_html_bytes(self, titulo: str, contenido: str) -> bytes:
        html_str = f"""<!DOCTYPE html>
<html>
<head>
    <title>{titulo}</title>
    <style>body {{ font-family: sans-serif; }}</style>
    <script>console.log("ignore script");</script>
</head>
<body>
    <h1>{titulo}</h1>
    <p>{contenido}</p>
</body>
</html>"""
        return html_str.encode("utf-8")

    def test_extraer_texto_html_unitario(self):
        """Prueba unitaria para extraer_texto_html omitiendo scripts/styles y formateando párrafos."""
        html_bytes = self._generar_html_bytes("Política de Teletrabajo", "Los empleados podrán trabajar remoto 2 días a la semana.")
        with tempfile.NamedTemporaryFile(suffix=".html", delete=False) as tmp:
            tmp.write(html_bytes)
            tmp_path = tmp.name

        try:
            resultado = extraer_texto_html(tmp_path)
            self.assertEqual(len(resultado), 1)
            self.assertEqual(resultado[0]["page"], 1)
            self.assertIn("Política de Teletrabajo", resultado[0]["text"])
            self.assertIn("remoto 2 días", resultado[0]["text"])
            self.assertNotIn("console.log", resultado[0]["text"])
            self.assertNotIn("font-family", resultado[0]["text"])
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_upload_pdf_docx_html_y_validacion_formato(self):
        """Prueba 1: Subida de PDF, DOCX y HTML válidos, y rechazo de formatos no permitidos (.txt)."""
        pdf_bytes = self._generar_pdf_bytes("Politica de Seguridad Interna 2026")
        res_pdf = self.client.post(
            "/documents/upload",
            files={"file": ("politica_seguridad.pdf", pdf_bytes, "application/pdf")}
        )
        self.assertEqual(res_pdf.status_code, 201)
        data_pdf = res_pdf.json()
        self.assertEqual(data_pdf["original_name"], "politica_seguridad.pdf")
        self.assertEqual(data_pdf["type"], "pdf")

        # Subida de DOCX válido
        docx_bytes = self._generar_docx_bytes("Manual de Procedimientos Legales")
        res_docx = self.client.post(
            "/documents/upload",
            files={"file": ("manual_legal.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        )
        self.assertEqual(res_docx.status_code, 201)
        data_docx = res_docx.json()
        self.assertEqual(data_docx["original_name"], "manual_legal.docx")

        # Subida de HTML válido
        html_bytes = self._generar_html_bytes("Contrato de Confidencialidad", "Cláusula 1: Confidencialidad de datos")
        res_html = self.client.post(
            "/documents/upload",
            files={"file": ("contrato_nda.html", html_bytes, "text/html")}
        )
        self.assertEqual(res_html.status_code, 201)
        data_html = res_html.json()
        self.assertEqual(data_html["original_name"], "contrato_nda.html")
        self.assertEqual(data_html["type"], "html")

        # Subida de extensión no válida (.txt)
        res_txt = self.client.post(
            "/documents/upload",
            files={"file": ("invalido.txt", b"Texto plano no permitido", "text/plain")}
        )
        self.assertEqual(res_txt.status_code, 400)
        self.assertIn("Solo se permiten archivos .pdf, .docx, .html y .htm", res_txt.json()["detail"])

    def test_listar_y_obtener_documento(self):
        """Prueba 2: Listar documentos registrados y obtener documento por su ID."""
        pdf_bytes = self._generar_pdf_bytes("Documento para consulta individual")
        res_up = self.client.post(
            "/documents/upload",
            files={"file": ("consulta.pdf", pdf_bytes, "application/pdf")}
        )
        doc_id = res_up.json()["id"]

        res_list = self.client.get("/documents")
        self.assertEqual(res_list.status_code, 200)
        data_list = res_list.json()
        self.assertGreaterEqual(data_list["total"], 1)

        res_get = self.client.get(f"/documents/{doc_id}")
        self.assertEqual(res_get.status_code, 200)
        self.assertEqual(res_get.json()["id"], doc_id)

        res_404 = self.client.get("/documents/999999")
        self.assertEqual(res_404.status_code, 404)

    def test_eliminar_documento(self):
        """Prueba 3: Eliminar documento por ID y verificar remoción de registro y archivo físico."""
        pdf_bytes = self._generar_pdf_bytes("Documento para prueba de eliminación")
        res_up = self.client.post(
            "/documents/upload",
            files={"file": ("para_borrar.pdf", pdf_bytes, "application/pdf")}
        )
        doc_id = res_up.json()["id"]
        file_path = os.path.join(self.temp_dir, "para_borrar.pdf")
        self.assertTrue(os.path.exists(file_path))

        res_del = self.client.delete(f"/documents/{doc_id}")
        self.assertEqual(res_del.status_code, 200)

        res_get = self.client.get(f"/documents/{doc_id}")
        self.assertEqual(res_get.status_code, 404)

        res_del_404 = self.client.delete(f"/documents/{doc_id}")
        self.assertEqual(res_del_404.status_code, 404)

    def test_sincronizacion_sha256_con_html(self):
        """Prueba 4: Endpoint /documents/sync clasificando archivos HTML/PDF en added, updated y unchanged."""
        # 1. Crear un archivo HTML en el directorio físico sin registrarlo en la BD -> debe ser 'added'
        file1_path = os.path.join(self.temp_dir, "politica_interna.html")
        with open(file1_path, "wb") as f:
            f.write(self._generar_html_bytes("Política Interna", "Contenido inicial de la política"))

        res_sync1 = self.client.post("/documents/sync")
        self.assertEqual(res_sync1.status_code, 200)
        data_sync1 = res_sync1.json()

        self.assertIn("politica_interna.html", data_sync1["added"])
        self.assertEqual(data_sync1["total_processed"], 1)

        # 2. Segunda ejecución sin modificar archivos -> debe ser 'unchanged'
        res_sync2 = self.client.post("/documents/sync")
        self.assertEqual(res_sync2.status_code, 200)
        data_sync2 = res_sync2.json()

        self.assertIn("politica_interna.html", data_sync2["unchanged"])
        self.assertEqual(len(data_sync2["added"]), 0)

        # 3. Modificar contenido del archivo HTML físico -> su SHA-256 cambia -> debe ser 'updated'
        with open(file1_path, "wb") as f:
            f.write(self._generar_html_bytes("Política Interna Modificada", "Versión 2.0 con nuevos términos"))

        res_sync3 = self.client.post("/documents/sync")
        self.assertEqual(res_sync3.status_code, 200)
        data_sync3 = res_sync3.json()

        self.assertIn("politica_interna.html", data_sync3["updated"])

        # Verificar que la cantidad de registros para 'politica_interna.html' en SQLite siga siendo 1 sin duplicados
        res_list = self.client.get("/documents")
        docs_politica = [d for d in res_list.json()["documents"] if d["name"] == "politica_interna.html"]
        self.assertEqual(len(docs_politica), 1)

    def test_upload_reemplazo_sin_duplicados(self):
        """Prueba 6: Re-subida de un documento con el mismo nombre actualiza la entrada sin crear duplicados en SQLite."""
        pdf1 = self._generar_pdf_bytes("Versión 1 del documento")
        res1 = self.client.post(
            "/documents/upload",
            files={"file": ("manual.pdf", pdf1, "application/pdf")}
        )
        self.assertEqual(res1.status_code, 201)
        doc1_id = res1.json()["id"]

        pdf2 = self._generar_pdf_bytes("Versión 2 del documento modificada")
        res2 = self.client.post(
            "/documents/upload",
            files={"file": ("manual.pdf", pdf2, "application/pdf")}
        )
        self.assertEqual(res2.status_code, 201)
        doc2_id = res2.json()["id"]

        # El ID debe ser el mismo (actualizado) y no debe existir más de 1 registro para 'manual.pdf'
        self.assertEqual(doc1_id, doc2_id)

        res_list = self.client.get("/documents")
        docs_manual = [d for d in res_list.json()["documents"] if d["name"] == "manual.pdf"]
        self.assertEqual(len(docs_manual), 1)

    def test_chat_conversation_continuity(self):
        """Prueba 5: Endpoint /chat con reutilización de conversation_id e historial."""
        with patch("backend.services.llm.LLMService.generar_respuesta", return_value="Respuesta de prueba RAG"):
            # 1. Primer mensaje sin conversation_id -> crea conversación
            res1 = self.client.post("/chat", json={"question": "¿Cuáles son las vacaciones?"})
            self.assertEqual(res1.status_code, 200)
            data1 = res1.json()
            conv_id = data1["conversation_id"]
            self.assertIsNotNone(conv_id)

            # 2. Segundo mensaje con conversation_id -> mantiene la misma conversación
            res2 = self.client.post("/chat", json={"question": "¿Y sobre el teletrabajo?", "conversation_id": conv_id})
            self.assertEqual(res2.status_code, 200)
            data2 = res2.json()
            self.assertEqual(data2["conversation_id"], conv_id)

            # 3. Verificar que la conversación contenga los 4 mensajes (2 de usuario, 2 de asistente)
            res_conv = self.client.get(f"/chat/conversations/{conv_id}")
            self.assertEqual(res_conv.status_code, 200)
            conv_data = res_conv.json()
            self.assertEqual(len(conv_data["messages"]), 4)


if __name__ == "__main__":
    unittest.main()
