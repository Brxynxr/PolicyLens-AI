# Reporte de Diagnóstico de Umbrales (BAAI/bge-m3)

**Pool consultado:** top_12 de ChromaDB (sin filtros) · **Reportado:** Top 3 por pregunta · **Fórmula híbrida:** `(cos × 0.85) + (bm25 × 0.15) + boost`

---

## P1: ¿Cuántos días de vacaciones tengo por año?

| Rank | Documento / Fuente | Cos Score | Hybrid Score | Snippet del Texto |
|---|---|---|---|---|
| Top 1 | manual_rrhh_2026.pdf (p.2) (bm25=100.0) | 68.8 | 73.5 | ## SECCIÓN 3: VACACIONES   ### 3.1 Derecho a Vacaciones   Todos los empleados contratados a tiempo completo tienen derecho a 15 días hábiles de vacaci |
| Top 2 | politica_permisos_licencias.pdf (p.2) (bm25=73.4) | 57.1 | 59.5 | ## **3. LICENCIA POR ENFERMEDAD**   Ante incapacidad médica, el empleado debe informar a su líder y cargar la incapacidad en HR Portal dentro de los 2 |
| Top 3 | politica_gastos_viaje.docx (p.1) (bm25=12.5) | 54.0 | 47.8 | POLÍTICA DE GASTOS DE VIAJE Y VIÁTICOS  TechCorp Internacional S.A.S. — Área de Finanzas. Versión vigente desde febrero de 2026.  1. AUTORIZACIONES  T |

---

## P2: ¿De cuánto es el aumento salarial por desempeño excepcional?

| Rank | Documento / Fuente | Cos Score | Hybrid Score | Snippet del Texto |
|---|---|---|---|---|
| Top 1 | politica_salario_beneficios.docx (p.1) (bm25=100.0, boost=+15.0) | 56.1 | 77.7 | POLÍTICA DE SALARIO Y BENEFICIOS 2026  TechCorp Internacional S.A.S. — Aprobada por Gerencia General y Vigilada por Recursos Humanos. Vigencia anual.  |
| Top 2 | politica_salario_beneficios.docx (p.1) (boost=+15.0) | 54.7 | 61.5 | Bono por antigüedad: después de 5 años de servicio se reconoce un bono único equivalente a un mes de salario; después de 10 años, dos meses de salario |
| Top 3 | reglamento_interno_2026.pdf (p.1) | 44.6 | 37.9 | # **REGLAMENTO INTERNO DE TRABAJO 2026**   **Empresa:** TechCorp Internacional S.A.S. \| **Vigencia:** 1 de enero de 2026 al 31 de diciembre de 2026   |

---

## P3: ¿Hasta cuántos días a la semana puedo trabajar en remoto?

| Rank | Documento / Fuente | Cos Score | Hybrid Score | Snippet del Texto |
|---|---|---|---|---|
| Top 1 | manual_rrhh_2026.pdf (p.3) (bm25=100.0) | 66.1 | 71.2 | ## SECCIÓN 7: TELETRABAJO   ### 7.1 Política de Teletrabajo Híbrido   La empresa implementa un esquema de trabajo híbrido que permite a los   empleado |
| Top 2 | reglamento_interno_2026.pdf (p.1) (bm25=37.4) | 61.1 | 57.5 | # **REGLAMENTO INTERNO DE TRABAJO 2026**   **Empresa:** TechCorp Internacional S.A.S. \| **Vigencia:** 1 de enero de 2026 al 31 de diciembre de 2026   |
| Top 3 | politica_permisos_licencias.pdf (p.1) (bm25=16.7) | 56.1 | 50.2 | # **POLÍTICA DE PERMISOS Y LICENCIAS**   **TechCorp Internacional S.A.S.** — Documento de circulación interna. Actualización: enero de 2026.   ## **1. |

---

## P4: ¿Cuál es la capital de Francia?

| Rank | Documento / Fuente | Cos Score | Hybrid Score | Snippet del Texto |
|---|---|---|---|---|
| Top 1 | reglamento_interno_2026.pdf (p.1) | 30.9 | 26.3 | # **REGLAMENTO INTERNO DE TRABAJO 2026**   **Empresa:** TechCorp Internacional S.A.S. \| **Vigencia:** 1 de enero de 2026 al 31 de diciembre de 2026   |
| Top 2 | politica_gastos_viaje.docx (p.1) | 29.4 | 25.0 | POLÍTICA DE GASTOS DE VIAJE Y VIÁTICOS  TechCorp Internacional S.A.S. — Área de Finanzas. Versión vigente desde febrero de 2026.  1. AUTORIZACIONES  T |
| Top 3 | contrato_confidencialidad.docx (p.1) | 26.7 | 22.7 | CONTRATO DE CONFIDENCIALIDAD Y PROTECCIÓN DE DATOS  Contrato N°: NDA-2026-045  Fecha: 15 de enero de 2026  PARTE A: TechCorp Internacional S.A.  NIT:  |

---

## Código Actual de Umbrales en rag.py

- `UMBRAL_COS_RELEVANTE` actual: **42.0**
- `UMBRAL_HIBRIDO_RELEVANTE` actual: **45.0**
- `UMBRAL_COS_FALLBACK` actual (Top-1 sin filtros previos): **40.5**
