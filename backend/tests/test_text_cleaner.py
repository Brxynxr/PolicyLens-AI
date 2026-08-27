import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.utils.text_cleaner import (
    sin_tildes,
    nombre_documento_legible,
    formatear_cita,
    limpiar_texto_pasaje,
    limpiar_boilerplate_institucional,
    resaltar_terminos_clave,
    extraer_pasaje_conciso,
)


class TestTextCleanerUtils(unittest.TestCase):

    def test_sin_tildes(self):
        self.assertEqual(sin_tildes("política de contratación"), "politica de contratacion")
        self.assertEqual(sin_tildes("año"), "ano")
        self.assertEqual(sin_tildes("días"), "dias")

    def test_nombre_documento_legible(self):
        self.assertEqual(nombre_documento_legible("manual_rrhh_2026.pdf"), "Manual RRHH 2026")
        self.assertEqual(nombre_documento_legible("politica_seguridad_ti.docx"), "Politica Seguridad TI")

        self.assertEqual(nombre_documento_legible("nda_confidencialidad.pdf"), "NDA Confidencialidad")

    def test_formatear_cita(self):
        cita1 = formatear_cita("manual_rrhh_2026.pdf", page=3, section="Teletrabajo")
        self.assertEqual(cita1, "Manual RRHH 2026 — Sección Teletrabajo (Pág. 3)")

        cita2 = formatear_cita("reglamento_interno.pdf", page=5, section="Artículo 12")
        self.assertEqual(cita2, "Reglamento Interno — Artículo 12 (Pág. 5)")

        cita3 = formatear_cita("manual.pdf", page=1, section="General")
        self.assertEqual(cita3, "Manual (Pág. 1)")

    def test_limpiar_texto_pasaje(self):
        raw = 'SECCIÓN 7: TELETRABAJO 7.1 Política de Teletrabajo Híbrido La empresa... ### 7.2 Requisitos: - Punto A - Punto B'
        cleaned = limpiar_texto_pasaje(raw)
        self.assertNotIn("###", cleaned)
        self.assertIn("- Punto A", cleaned)
        self.assertIn("- Punto B", cleaned)
        self.assertIn("7.2 Requisitos:", cleaned)


    def test_limpiar_boilerplate_institucional(self):
        raw = "Proceso: Seguridad y Privacidad Versión: 5 SYPI.MN.01 Clasificación: Pública 49 de 69\nContenido de la política.\nPBX 57(2) 664 44 24 www.cdav.gov.co"
        cleaned = limpiar_boilerplate_institucional(raw)
        self.assertNotIn("Proceso: Seguridad", cleaned)
        self.assertNotIn("SYPI.MN.01", cleaned)
        self.assertNotIn("PBX", cleaned)
        self.assertIn("Contenido de la política.", cleaned)

    def test_resaltar_terminos_clave(self):
        texto = "Los trabajadores tienen derecho a quince días de vacaciones remuneradas."
        resaltado = resaltar_terminos_clave(texto, "¿Cuántos días de vacaciones tengo?")
        self.assertIn("**vacaciones**", resaltado)

    def test_extraer_pasaje_conciso(self):
        parrafo1 = "Texto administrativo de presentación sin relevancia."
        parrafo2 = "ARTICULO 70. DEBERES GENERALES DE LOS TRABAJADORES. Cumplir la constitución y las normas."
        texto = f"{parrafo1}\n\n{parrafo2}"
        conciso = extraer_pasaje_conciso(texto, "¿Cuáles son los deberes generales de los trabajadores?", max_chars=120)
        self.assertIn("DEBERES GENERALES", conciso)


if __name__ == '__main__':
    unittest.main()

