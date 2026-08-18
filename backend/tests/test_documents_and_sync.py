import os
import sys
import io
import shutil
import tempfile
import unittest
import fitz  # PyMuPDF
import docx
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.database import Base, get_db
from backend.main import app
from backend.routers import documents as docs_router_mod
from backend.routers import sync as sync_router_mod

# SQLite en memoria compartido usando StaticPool para hilos/peticiones de FastAPI
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
        self.temp_dir = tempfile.mkdtemp()
        self.old_docs_dir_1 = docs_router_mod.DOCUMENTS_DIR
        self.old_docs_dir_2 = sync_router_mod.DOCUMENTS_DIR
        docs_router_mod.DOCUMENTS_DIR = self.temp_dir
        sync_router_mod.DOCUMENTS_DIR = self.temp_dir
        self.db = TestingSessionLocal()

    def tearDown(self):
        docs_router_mod.DOCUMENTS_DIR = self.old_docs_dir_1
        sync_router_mod.DOCUMENTS_DIR = self.old_docs_dir_2
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
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

    def test_upload_pdf_docx_y_validacion_formato(self):
        """Prueba 1: Subida de PDF/DOCX válidos y rechazo de formatos no permitidos (.txt)."""
        pdf_bytes = self._generar_pdf_bytes("Politica de Seguridad Interna 2026")
        res_pdf = self.client.post(
            "/documents/upload",
            files={"file": ("politica_seguridad.pdf", pdf_bytes, "application/pdf")}
        )
        self.assertEqual(res_pdf.status_code, 201)
        data_pdf = res_pdf.json()
        self.assertEqual(data_pdf["original_name"], "politica_seguridad.pdf")
        self.assertEqual(data_pdf["type"], "pdf")
        self.assertIsNotNone(data_pdf["id"])

        # Subida de DOCX válido
        docx_bytes = self._generar_docx_bytes("Manual de Procedimientos Legales")
        res_docx = self.client.post(
            "/documents/upload",
            files={"file": ("manual_legal.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        )
        self.assertEqual(res_docx.status_code, 201)
        data_docx = res_docx.json()
        self.assertEqual(data_docx["original_name"], "manual_legal.docx")

        # Subida de extensión no válida (.txt)
        res_txt = self.client.post(
            "/documents/upload",
            files={"file": ("invalido.txt", b"Texto plano no permitido", "text/plain")}
        )
        self.assertEqual(res_txt.status_code, 400)
        self.assertIn("Solo se permiten archivos .pdf y .docx", res_txt.json()["detail"])

    def test_listar_y_obtener_documento(self):
        """Prueba 2: Listar documentos registrados y obtener documento por su ID."""
        pdf_bytes = self._generar_pdf_bytes("Documento para consulta individual")
        res_up = self.client.post(
            "/documents/upload",
            files={"file": ("consulta.pdf", pdf_bytes, "application/pdf")}
        )
        doc_id = res_up.json()["id"]

        # Listar documentos
        res_list = self.client.get("/documents")
        self.assertEqual(res_list.status_code, 200)
        data_list = res_list.json()
        self.assertGreaterEqual(data_list["total"], 1)

        # Obtener por ID
        res_get = self.client.get(f"/documents/{doc_id}")
        self.assertEqual(res_get.status_code, 200)
        self.assertEqual(res_get.json()["id"], doc_id)

        # ID inexistente -> 404
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

        # Eliminar
        res_del = self.client.delete(f"/documents/{doc_id}")
        self.assertEqual(res_del.status_code, 200)

        # Verificar que el registro ya no existe
        res_get = self.client.get(f"/documents/{doc_id}")
        self.assertEqual(res_get.status_code, 404)

        # Verificar eliminación de 404 subsecuente
        res_del_404 = self.client.delete(f"/documents/{doc_id}")
        self.assertEqual(res_del_404.status_code, 404)

    def test_sincronizacion_sha256(self):
        """Prueba 4: Endpoint /documents/sync clasificando archivos en added, updated y unchanged."""
        # 1. Crear un archivo en el directorio físico sin registrarlo previamente en la BD -> debe ser 'added'
        file1_path = os.path.join(self.temp_dir, "archivo_nuevo.pdf")
        with open(file1_path, "wb") as f:
            f.write(self._generar_pdf_bytes("Nuevo documento sin registrar"))

        # Ejecutar sincronización
        res_sync1 = self.client.post("/documents/sync")
        self.assertEqual(res_sync1.status_code, 200)
        data_sync1 = res_sync1.json()

        self.assertIn("archivo_nuevo.pdf", data_sync1["added"])
        self.assertEqual(data_sync1["total_processed"], 1)

        # 2. Segunda ejecución sin modificar archivos -> debe ser 'unchanged'
        res_sync2 = self.client.post("/documents/sync")
        self.assertEqual(res_sync2.status_code, 200)
        data_sync2 = res_sync2.json()

        self.assertIn("archivo_nuevo.pdf", data_sync2["unchanged"])
        self.assertEqual(len(data_sync2["added"]), 0)

        # 3. Modificar contenido del archivo físico -> su SHA-256 cambia -> debe ser 'updated'
        with open(file1_path, "wb") as f:
            f.write(self._generar_pdf_bytes("Contenido completamente Modificado 2026"))

        res_sync3 = self.client.post("/documents/sync")
        self.assertEqual(res_sync3.status_code, 200)
        data_sync3 = res_sync3.json()

        self.assertIn("archivo_nuevo.pdf", data_sync3["updated"])


if __name__ == "__main__":
    unittest.main()
