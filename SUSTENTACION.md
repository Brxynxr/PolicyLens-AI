# SUSTENTACIÓN — PolicyLens AI

**Proyecto:** Navegador Inteligente de Políticas y Contratos Internos (Chatbot RAG Empresarial)
**Repositorio:** `PolicyLens-AI` — rama `test`

---

## 1. INTRODUCCIÓN Y PROBLEMA A RESOLVER

En las empresas, la información crítica (políticas internas, contratos, reglamentos) está dispersa en documentos de distintos formatos (PDF, Word, HTML). El empleado promedio pierde tiempo valioso buscando respuestas simples: *¿cuántos días de vacaciones tengo?, ¿qué viáticos aplican a un viaje internacional?, ¿cuál es el proceso de renuncia?*

**PolicyLens AI** resuelve este problema con un chatbot inteligente que permite **preguntar en lenguaje natural** y recibir **respuestas exactas con cita del documento, página y sección**, usando inteligencia artificial 100% local (sin depender de servicios en la nube ni exponer información confidencial).

---

## 2. OBJETIVO DEL PROYECTO

> Construir un sistema de pregunta-respuesta sobre documentos internos empresariales mediante arquitectura **RAG (Retrieval-Augmented Generation)**, que garantice respuestas precisas, trazables a la fuente, operando de forma autónoma en un entorno local.

**Objetivos específicos cumplidos:**

| # | Objetivo | Estado |
|---|---|---|
| 1 | Ingesta multi-formato de documentos (PDF, DOCX, HTML) | ✅ |
| 2 | Indexación vectorial con búsqueda semántica | ✅ |
| 3 | Respuestas generadas por LLM con citas verificables | ✅ |
| 4 | Modo alternativo sin LLM (búsqueda semántica pura) | ✅ |
| 5 | Interfaz web completa (login, chat, documentos, usuarios) | ✅ |
| 6 | Operación 100% local con modelos open-source | ✅ |

---

## 3. TECNOLOGÍAS UTILIZADAS

### 3.1 Backend (Python)

| Tecnología | Uso | Justificación |
|---|---|---|
| **Python 3.13** | Lenguaje base | Ecosistema líder en NLP e IA |
| **FastAPI + Uvicorn** | API REST | Alto rendimiento, validación automática, docs interactivas (`/docs`) |
| **SQLAlchemy 2.0** | ORM | Gestión relacional de usuarios, documentos y conversaciones |
| **Pydantic v2** | Esquemas | Validación estricta de entrada/salida de la API |
| **SQLite** | Base de datos | Persistencia ligera sin servidor externo |

### 3.2 Procesamiento de Documentos

| Tecnología | Uso | Justificación |
|---|---|---|
| **PyMuPDF + pymupdf4llm** | Extracción PDF → **Markdown estructurado** | Conserva encabezados (#), listas y tablas; mejora el contexto de los embeddings |
| **python-docx** | Extracción DOCX | Lectura nativa de párrafos y estilos |
| **html.parser (stdlib)** | Extracción HTML | Parser propio que filtra `script/style` y conserva estructura semántica |
| **hashlib SHA-256** | Huella digital | Detección de cambios y control de duplicados |

### 3.3 Inteligencia Artificial / NLP

| Tecnología | Uso | Justificación |
|---|---|---|
| **sentence-transformers** (`paraphrase-multilingual-MiniLM-L12-v2`) | Embeddings locales de 384 dimensiones | Modelo multilingüe liviano, corre sin GPU ni internet |
| **ChromaDB** | Base de datos vectorial persistente | Almacenamiento embebido con distancia coseno |
| **rank_bm25 (BM25Okapi)** | Scoring léxico | Re-ranking por palabras clave exactas ponderado por IDF |
| **Ollama + Qwen 2.5 3B** | LLM generativo local | Respuestas naturales sin enviar datos a terceros |
| **NVIDIA NIM (Llama 3.1 8B)** | LLM alternativo vía API | Modo configurable para mayor calidad si hay conectividad |

### 3.4 Frontend

| Tecnología | Uso | Justificación |
|---|---|---|
| **React 19 + TypeScript** | SPA | Componentes tipados y mantenibles |
| **Vite** | Build tool | Desarrollo con hot-reload instantáneo |
| **Tailwind CSS 4** | Estilos | Sistema de diseño consistente y rápido |
| **Axios** | Cliente HTTP | Interceptores centralizados de errores |

---

## 4. ARQUITECTURA DEL SISTEMA

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│   Login │ Chat │ Documentos │ Sync │ Usuarios                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP /api/* (proxy Vite)
┌──────────────────────────▼──────────────────────────────────────┐
│                     BACKEND (FastAPI :8000)                      │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │  Auth    │  │ Documents│  │   Sync   │  │     Chat       │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────┬────────┘  │
│                                                     │           │
│           ┌─────────────────────────────────────────▼────────┐  │
│           │              SERVICIO RAG (orquestador)          │  │
│           │  búsqueda híbrida · scoring · prompt · historial │  │
│           └───────┬──────────────────┬───────────────────────┘  │
│                   │                  │                          │
│  ┌────────────────▼───┐   ┌──────────▼──────────┐               │
│  │ EmbeddingService   │   │   LLMService        │               │
│  │ MiniLM (local 384d)│   │ Ollama/Qwen o NIM   │               │
│  └────────────────┬───┘   └─────────────────────┘               │
│                   │                                              │
│  ┌────────────────▼───┐   ┌──────────────────────────────────┐  │
│  │      ChromaDB      │   │         SQLite (SQLAlchemy)      │  │
│  │ vectores + chunks  │   │ usuarios·docs·conversaciones     │  │
│  └────────────────────┘   └──────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. PROCESOS PRINCIPALES

### 5.1 Proceso de Ingesta (Indexación de Documentos)

```
Archivo (.pdf/.docx/.html)
   │ 1. DETECCIÓN DE FORMATO
   ▼
Extracción de texto
   • PDF  → pymupdf4llm → MARKDOWN estructurado (encabezados, listas, tablas)
   • DOCX → python-docx → párrafos
   • HTML → parser propio → texto limpio
   │ 2. HASH SHA-256 (control de duplicados y cambios)
   ▼
Chunking SEMÁNTICO (utils/chunking.py)
   • Divide por párrafos (\n\n) → oraciones (. ! ? :) → espacios
   • Máx. 1500 caracteres (~512 tokens), overlap 200 (13%)
   • Las oraciones NUNCA quedan cortadas a la mitad
   │ 3. METADATOS (documento, página, sección, índice)
   ▼
Embeddings locales (MiniLM, 384d)
   │ 4. UPSERT
   ▼
ChromaDB (colección "documents", distancia coseno)
   + Registro en SQLite (estado processed)
```

### 5.2 Proceso de Consulta (RAG)

```
Pregunta del empleado: "¿Cuántos días de vacaciones me corresponden por año?"
   │ 1. NORMALIZACIÓN (sin tildes: 'ano'≡'año', 'dias'≡'días')
   ▼
Embedding de la pregunta (MiniLM local)
   │ 2. BÚSQUEDA VECTORIAL — top 12 chunks (ChromaDB, coseno)
   ▼
SCORING HÍBRIDO
   hybrid_score = similitud_coseno × 0.7  +  BM25_normalizado × 0.3
   • BM25 sobre términos sin stopwords ('que','de','para' se descartan)
   • Filtrado: score ≥ 38 · deduplicación por documento · máx. 2 chunks
   │ 3. CONTEXTO + HISTORIAL + SYSTEM PROMPT
   ▼
LLM (Qwen 2.5 3B vía Ollama)
   • Regla: responder SOLO con el contexto, citar documento/página/sección
   • Si no está en los documentos: "No encontré esa información..."
   │ 4. PERSISTENCIA
   ▼
Respuesta + fuentes guardadas en SQLite (conversación continua)
```

### 5.3 Proceso de Sincronización (`POST /documents/sync`)

Escanea la carpeta física `documents/`, compara hashes SHA-256 contra SQLite y clasifica cada archivo como **added / updated / unchanged**, re-indexando solo lo necesario. Esto mantiene la base vectorial siempre coherente con el sistema de archivos.

### 5.4 Proceso de Seguridad y Roles

- Login con credenciales contra SQLite; usuario admin creado automáticamente al primer arranque.
- Roles `admin` / `empleado`; gestión CRUD de usuarios desde la interfaz.
- El frontend guarda la sesión activa y adapta vistas según el rol.

---

## 6. ¿CÓMO SE LOGRÓ EL OBJETIVO? — TRABAJO REALIZADO

### 6.1 Pipeline de ingesta de alta calidad

El punto crítico de todo sistema RAG es **lo bien que se trocea y representa el texto**. Se logró:

1. **Extracción Markdown con pymupdf4llm**: los PDFs se convierten conservando jerarquía (`#`, `##`) — el modelo entiende qué es título y qué es contenido.
2. **Chunking semántico recursivo**: se reemplazó el corte rígido cada 500 caracteres (que partía oraciones y condiciones legales a la mitad) por división por párrafos → oraciones, con solapamiento del 13% arrastrando unidades completas.
3. **Metadatos completos**: cada fragmento sabe de qué documento, página y sección proviene → respuestas citables.

### 6.2 Búsqueda híbrida con doble señal

La búsqueda puramente semántica falla con nombres propios o cifras exactas; la puramente léxica falla con sinónimos. Se combinaron ambas:

- **70% similitud coseno** (semántica, embeddings multilingües).
- **30% BM25** (léxica, palabras clave exactas ponderadas por rareza IDF).
- Normalización Unicode: consultas escritas **sin ñ ni tildes** ("por ano", "cuantos dias") coinciden con el texto formal ("año", "días").
- Filtros de relevancia calibrados (umbral 38/100) y deduplicación por documento.

### 6.3 Respuestas confiables y trazables

- System Prompt estricto: prohibido inventar; obligatorio citar fuente; respuesta fija cuando no hay información.
- **Modo dual**: `rag` (LLM generativo) y `search` (extracción directa sin LLM, con re-ranking de pasajes narrativos y exclusión de encabezados sueltos).

### 6.4 Robustez ante fallos reales (resiliencia)

Durante el desarrollo se detectaron y corrigieron fallos críticos:

| Problema detectado | Solución implementada |
|---|---|
| Embeddings almacenados como vectores nulos (librería ausente) | Fallback de emergencia + verificación de norma del vector |
| Conflicto de dimensiones al cambiar de modelo (1024d vs 384d) | Auto-reset de colección ChromaDB y re-indexación |
| Encabezados elegidos como "pasaje principal" en modo search | Score 0 para líneas `< 80` chars o iniciadas con `#` |
| Pasajes vacíos en ciertos PDFs | Fallback: nunca ocultar el contenido recuperado |
| Duplicados en SQLite al re-sincronizar | Upsert por nombre de archivo + hash SHA-256 |

### 6.5 Verificación

- **13/13 pruebas automatizadas** (pytest): hashing, chunking, extracción PDF/DOCX/HTML, ORM, endpoints FastAPI, sincronización y continuidad conversacional.
- Pruebas funcionales end-to-end contra el backend real con preguntas en lenguaje natural sobre los 8 documentos del corpus.

---

## 7. RESULTADOS DEMOSTRABLES (DEMO)

Corpus actual: **8 documentos corporativos** (manual de RRHH, contrato de confidencialidad, política de seguridad, reglamento interno, salario y beneficios, permisos y licencias, código de conducta, gastos de viaje) → **18 chunks indexados**.

Consultas de ejemplo ejecutadas con éxito:

| Pregunta (lenguaje natural) | Respuesta del sistema |
|---|---|
| "¿Cuántos días de vacaciones me corresponden por año?" | 15 días hábiles; 20 con +5 años; 25 con +10 — *manual_rrhh_2026.pdf, pág. 2* |
| "¿Cuántos días de luto tengo si fallece un familiar?" | 7 días cónyuge/hijo; 3 días padres/hermanos — *politica_permisos_licencias.pdf* |
| "¿Qué bono recibo con 5 años de antigüedad?" | Bono único de un mes de salario — *politica_salario_beneficios.docx* |
| "¿Cuáles son los viáticos para Europa?" | 110 USD/día; anticipos del 70% — *politica_gastos_viaje.docx* |

*(Funciona incluso escribiendo sin tildes ni ñ: "cuantos dias... por ano")*

---

## 8. CONCLUSIONES

1. Se construyó un **sistema RAG completo y funcional** que responde preguntas empresariales con precisión y trazabilidad total a la fuente.
2. La operación **100% local** (Ollama + MiniLM + ChromaDB + SQLite) elimina costos de API y riesgos de fuga de información confidencial.
3. La calidad de las respuestas depende directamente de la **calidad de la ingesta**: la inversión en extracción Markdown, chunking semántico y scoring híbrido fue determinante.
4. La arquitectura es **extensible**: nuevos formatos, nuevos modelos de LLM/embeddings o migración a bases vectoriales en la nube solo requieren cambiar un servicio desacoplado.

## 9. TRABAJO FUTURO

- Autenticación con tokens JWT y contraseñas hasheadas (bcrypt).
- Evaluación automática de calidad de recuperación (métricas Recall@K / MRR).
- Soporte para OCR (PDFs escaneados) y hojas de cálculo.
- Despliegue con Docker Compose para instalación en un solo comando.
