# PolicyLens-AI — Navegador Inteligente de Políticas, Reglamentos y Contratos Internos

<div align="center">

![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_DB-FF6B6B?style=for-the-badge)
![Ollama](https://img.shields.io/badge/Ollama-phi4--mini-000000?style=for-the-badge&logo=ollama&logoColor=white)
![Embeddings](https://img.shields.io/badge/Embeddings-qwen3--embedding:0.6b-7C3AED?style=for-the-badge)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)

**Plataforma web empresarial para la consulta en lenguaje natural de normativas corporativas, manuales de RRHH, reglamentos internos de trabajo, políticas de seguridad y contratos, impulsada por una arquitectura RAG (Retrieval-Augmented Generation) híbrida y de alta precisión.**

</div>

---

## Tabla de Contenidos

1. [Problema y Solución](#problema-y-solución)
2. [Arquitectura y Capacidades Clave](#arquitectura-y-capacidades-clave)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Instalación y Puesta en Marcha](#instalación-y-puesta-en-marcha)
5. [Despliegue con Docker Compose](#despliegue-con-docker-compose)
6. [Estructura del Proyecto](#estructura-del-proyecto)
7. [Referencia de la API REST](#referencia-de-la-api-rest)
8. [Variables de Entorno (.env)](#variables-de-entorno-env)
9. [Seguridad y Control de Acceso](#seguridad-y-control-de-acceso)
10. [Pruebas Automatizadas](#pruebas-automatizadas)

---

## Problema y Solución

* **El Problema:** En las organizaciones, los colaboradores invierten tiempo valioso localizando normativas específicas en documentos extensos, reglamentos densos y contratos corporativos, lo que genera demoras operativas y consultas repetitivas a Recursos Humanos y Legal.
* **La Solución PolicyLens-AI:** Un centro inteligente de consulta donde cualquier colaborador puede formular dudas en lenguaje natural y obtener respuestas inmediatas, fundamentadas y contextualizadas, acompañadas de las fuentes exactas, páginas y fragmentos documentales originales.

---

## Arquitectura y Capacidades Clave

```
[ Usuario ] ───> [ React 19 Frontend (Vite) ]
                          │  (REST / SSE Streaming)
                          ▼
            [ FastAPI Backend (Python 3.12) ]
              │             │              │
    [ SQLite / SQLAlchemy ] │       [ Rate Limiting & Audit ]
    (Usuarios, Chats, Logs) │       (Slowapi, SHA-256 Hashes)
                            ▼
              ┌───────────────────────────┐
              │   Pipeline RAG Híbrido    │
              │ • Embeddings Qwen3 (1024D)│
              │ • Búsqueda Léxica BM25    │
              │ • Filtro Anti-Índices     │
              │ • Boost de Metadatos      │
              └─────────────┬─────────────┘
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
      [ ChromaDB Vectorstore ]    [ Ollama Local LLM ]
      (Índice HNSW Coseno)       (phi4-mini / qwen2.5)
```

### 1. Motor RAG Híbrido de Alta Precisión
* **Embeddings de Nueva Generación:** Modelo **`qwen3-embedding:0.6b`** vía Ollama (1024 dimensiones, ventana de contexto de 32k tokens, líder multilingüe MTEB) con prefijos de instrucción semántica (`Instruct:` / `Query:`).
* **Fusión Híbrida Semántica + Léxica:** Combinación ponderada de similitud coseno vectorial (70%) y **BM25Okapi** (30%) con índice en memoria optimizado.
* **Filtro Anti-Índices:** Detección y exclusión algorítmica de tablas de contenido e índices formales para evitar falsos positivos y garantizar solo fragmentos sustantivos.
* **Boost de Metadatos y Sinónimos de Dominio:** Ponderación inteligente de términos clave del dominio laboral y legal (salarios, incapacidades, sanciones, teletrabajo, confidencialidad).

### 2. Inferencia LLM y Streaming en Tiempo Real
* **Modelo Local por Defecto:** **`phi4-mini`** (3.8B, Microsoft) ejecutado localmente mediante Ollama, garantizando privacidad total y costo cero de inferencia. Compatible con `qwen2.5:3b`, `qwen2.5:7b`, `llama3.2` y APIs compatibles con OpenAI.
* **Streaming Server-Sent Events (SSE):** Generación fluida token a token vía `/chat/stream`.
* **Reformulación Contextual de Preguntas:** Resolución de anáforas y preguntas elípticas de seguimiento (ej: *"¿y si falto dos días?"*, *"¿cuánto se paga en ese caso?"*) manteniendo el hilo conversacional.

### 3. Modo Dual de Consulta
* **Modo Respuesta Generada (IA):** El asistente interpreta la pregunta, recupera los pasajes relevantes, sintetiza una respuesta estructurada y cita las fuentes.
* **Modo Solo Documento:** Recuperación semántica directa de fragmentos y artículos literales desde ChromaDB sin latencia de LLM.

### 4. Experiencia de Usuario y Renderizado Avanzado
* **Formateo Enriquecido en React (`FormattedText.tsx`):**
  * Desarmado automático de pseudo-tablas generadas por LLMs en listas verticales ordenadas.
  * Renderizado responsivo de tablas Markdown con scroll horizontal (`overflow-x-auto`).
  * Detección y estilización de artículos normativos (`ARTICULO 53.`, `CAPÍTULO II:`).
  * Badges de documentos legibles (`DocumentHeaderBadge`) con separación camelCase y páginas.
  * Insignias interactivas para citas incrustadas en línea.
* **Tarjetas de Fuentes Agrupadas (`SourceCard.tsx`):** Consolidación por documento con contador de fragmentos, páginas referenciadas y visor colapsable.
* **Gestión de Historial:** Selección múltiple y eliminación por lotes de chats, más botón para copiar respuestas al portapapeles.
* **Monitoreo en Tiempo Real:** Indicadores de estado de Base de Datos y servidor LLM en el header.

### 5. Ingesta y Sincronización Incremental
* **Extracción Multi-formato:** Soporte nativo para `.pdf` (vía **PyMuPDF / fitz** de alta velocidad), `.docx` y `.html` (vía `html.parser` estándar).
* **Chunking Semántico y Contextual:** Segmentación Header-Aware de 1800 caracteres con 350 caracteres de overlap (~20%), división por expresiones regulares normativas (`ARTÍCULO \d+`, `CAPÍTULO [I|V|X]+`) e inyección de cabecera contextual (`[DOCUMENTO: ... | SECCIÓN: ... | PÁG: ...]`) para enriquecer la matriz de embeddings.
* **Sincronización por Hash SHA-256:** Detección de archivos añadidos, modificados o sin cambios en `./documents/` sin reindexaciones redundantes.

---

## Stack Tecnológico

| Capa | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Backend Framework** | Python 3.12 + FastAPI | API REST asíncrona, streaming SSE y documentación Swagger |
| **Base de Datos Relacional** | SQLite + SQLAlchemy 2.0 | Persistencia de usuarios, roles, conversaciones, mensajes y auditoría |
| **Migraciones de BD** | Alembic | Versionado y evolución de esquema relacional |
| **Base de Datos Vectorial** | ChromaDB (HNSW Coseno) | Almacenamiento e indexación semántica persistente de fragmentos |
| **Motor de Embeddings** | Ollama (`qwen3-embedding:0.6b`, 1024D) | Embeddings de alta densidad con 32k tokens de contexto |
| **Búsqueda Léxica** | Rank-BM25 | Scoring léxico BM25Okapi para recuperación híbrida |
| **Inferencia LLM** | Ollama (`phi4-mini`, 3.8B) | Generación de respuestas estructuradas en lenguaje natural |
| **Extracción Documental** | PyMuPDF (`fitz`), python-docx, html.parser | Extracción de texto y metadatos de PDF, DOCX y HTML |
| **Seguridad & Rate Limiting** | Slowapi, Passlib (bcrypt), SHA-256 | Rate limiting por IP, sanitización de paths y hash de contraseñas |
| **Frontend Framework** | React 19 + TypeScript + Vite | SPA moderna, modular y con tipado estático estricto |
| **Estilos y Diseño** | Tailwind CSS v4 | Diseño empresarial con paleta índigo/púrpura y modo responsivo |
| **Contenedores** | Docker + Docker Compose | Empaquetado y despliegue desacoplado (FastAPI + Nginx) |

---

## Instalación y Puesta en Marcha

### Requisitos Previos
* **Python:** 3.12 o superior
* **Node.js:** 20.x o superior con `npm`
* **Ollama:** Instalado y en ejecución en el sistema ([Descargar Ollama](https://ollama.ai))

---

### Paso 1: Clonar el Repositorio
```bash
git clone https://github.com/Brxynxr/PolicyLens-AI.git
cd PolicyLens-AI
```

### Paso 2: Configurar el Entorno Backend
```bash
# 1. Crear y activar entorno virtual
python3 -m venv .venv
source .venv/bin/activate

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Configurar variables de entorno
cp .env.example .env
```

### Paso 3: Descargar los Modelos en Ollama
En una terminal independiente, asegúrate de tener Ollama corriendo y descarga los modelos configurados:
```bash
# 1. Descargar el modelo LLM para generación de respuestas
ollama run phi4-mini

# 2. Descargar el modelo de embeddings
ollama pull qwen3-embedding:0.6b
```

### Paso 4: Ejecutar Migraciones de Base de Datos
```bash
# Aplicar migraciones iniciales de SQLAlchemy/Alembic
alembic upgrade head
```

### Paso 5: Iniciar el Servidor Backend
```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```
> *Al arrancar por primera vez, el sistema crea automáticamente las tablas SQLite y el usuario administrador por defecto.*

### Paso 6: Indexar los Documentos Iniciales
Si tienes archivos en `./documents/` o deseas inicializar la base de vectores:
```bash
python -m backend.scripts.reindexar_todo
```

### Paso 7: Iniciar el Frontend
En otra terminal:
```bash
cd frontend
npm install
npm run dev
```

La aplicación web estará disponible en **`http://localhost:5173`**.

---

## Despliegue con Docker Compose

Para desplegar la aplicación completa contenerizada (Backend FastAPI + Frontend servido con Nginx optimizado para SSE):

```bash
# 1. Asegurarte de tener el archivo .env configurado
cp .env.example .env

# 2. Iniciar Ollama en el sistema anfitrión con los modelos
ollama run phi4-mini
ollama pull qwen3-embedding:0.6b

# 3. Construir y levantar los contenedores
docker compose up --build -d
```

* **Frontend Web:** `http://localhost:5173`
* **Backend API & Swagger:** `http://localhost:8000/docs`
* **Persistencia:** Las carpetas `./chroma_data`, `./documents` y `./sql_app.db` se montan como volúmenes del host.
* **Caché Hugging Face:** Los pesos del modelo de embeddings se almacenan en el volumen Docker `policylens_hf_cache`.

Para detener los contenedores:
```bash
docker compose down
```

---

## Estructura del Proyecto

```
PolicyLens-AI/
├── .env.example                 # Plantilla de variables de entorno
├── .env                         # Variables de configuración activas (ignorado en git)
├── alembic.ini                  # Configuración de migraciones Alembic
├── docker-compose.yml           # Orquestación de contenedores Backend y Frontend
├── Dockerfile.backend           # Imagen Docker del servidor FastAPI (Python 3.12)
├── Dockerfile.frontend          # Imagen Docker multi-stage para React (Nginx Alpine)
├── requirements.txt             # Dependencias de Python
├── alembic/                     # Historial de versiones y migraciones SQLAlchemy
│   ├── env.py
│   └── versions/
│       └── 092c91e832d1_initial_schema_with_audit_logs.py
├── backend/
│   ├── __init__.py
│   ├── database.py              # Conexión SQLite y sesión SQLAlchemy
│   ├── main.py                  # Entrada FastAPI, ciclo de vida (lifespan) y CORS
│   ├── models/                  # Modelos relacionales ORM
│   │   ├── __init__.py
│   │   ├── audit_log.py         # Registro de auditoría y trazabilidad
│   │   ├── conversation.py      # Conversaciones y mensajes de chat
│   │   ├── document.py          # Metadatos de documentos y estado
│   │   └── user.py              # Usuarios y roles (admin / empleado)
│   ├── routers/                 # Controladores y endpoints REST
│   │   ├── __init__.py
│   │   ├── auth.py              # Autenticación (/auth/login, /auth/me)
│   │   ├── chat.py              # Chat síncrono, SSE y health check (/chat)
│   │   ├── documents.py         # CRUD de documentos y estadísticas (/documents)
│   │   ├── sync.py              # Sincronización y reindexación (/documents/sync)
│   │   └── users.py             # Gestión de usuarios (/users)
│   ├── schemas/                 # Esquemas Pydantic v2 (Validación E/S)
│   │   ├── __init__.py
│   │   ├── chat.py              # Esquemas de preguntas, respuestas y streaming
│   │   ├── document.py          # Esquemas de subida, listado y sincronización
│   │   └── user.py              # Esquemas de usuarios y login
│   ├── scripts/                 # Scripts utilitarios y evaluación
│   │   ├── __init__.py
│   │   ├── diagnostico_umbrales.py # Diagnóstico de similitud coseno y BM25
│   │   ├── evaluar_rag.py       # Evaluación automatizada de precisión y latencia
│   │   └── reindexar_todo.py    # Reindexación completa de ChromaDB y SQLite
│   ├── services/                # Capa de lógica de negocio
│   │   ├── __init__.py
│   │   ├── audit.py             # Servicio de registro de auditoría
│   │   ├── auth.py              # Lógica de autenticación y verificación bcrypt
│   │   ├── documents.py         # Procesamiento, hash y chunking
│   │   ├── embeddings.py        # Embeddings locales vía Ollama (qwen3-embedding)
│   │   ├── llm.py               # Servicio LLM (Ollama / OpenAI API) y streaming
│   │   └── rag.py               # Orquestador RAG híbrido, BM25 y filtrado
│   ├── tests/                   # Suite de pruebas automatizadas (pytest)
│   │   ├── test_chat_stream.py
│   │   ├── test_contextual_rag.py
│   │   ├── test_core_foundations.py
│   │   ├── test_documents_and_sync.py
│   │   └── test_text_cleaner.py
│   └── utils/                   # Utilidades modulares
│       ├── __init__.py
│       ├── chunking.py          # Chunking semántico Header-Aware (1800/350)
│       ├── docx.py              # Extracción de documentos Word (.docx)
│       ├── hashing.py           # Cálculo de hash SHA-256
│       ├── html.py              # Extracción de documentos HTML (.html, .htm)
│       ├── pdf.py               # Extracción ultrarrápida con PyMuPDF (.pdf)
│       └── text_cleaner.py      # Limpieza, normalización y formateo de pasajes
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── public/                  # Favicons e iconos temáticos
│   └── src/
│       ├── App.tsx              # Router principal y rutas protegidas
│       ├── index.css            # Tailwind CSS v4 y animaciones personalizadas
│       ├── main.tsx
│       ├── components/          # Componentes visuales reutilizables
│       │   ├── ConfirmDialog.tsx# Modal accesible de confirmación
│       │   ├── FileUpload.tsx   # Zona drag-and-drop con validación
│       │   ├── FormattedText.tsx# Renderizador semántico Markdown enriquecido
│       │   ├── Layout.tsx       # Layout maestro con navegación
│       │   ├── Sidebar.tsx      # Barra lateral flotante con control de rol
│       │   ├── SourceCard.tsx   # Tarjeta de fuentes agrupadas por documento
│       │   └── UserModal.tsx    # Modal de creación y edición de usuarios
│       ├── pages/               # Vistas principales
│       │   ├── ChatPage.tsx     # Chat conversacional con modo dual y monitores
│       │   ├── DocumentsPage.tsx# Dashboard de documentos y métricas RAG
│       │   ├── LoginPage.tsx    # Acceso con protección rate-limit
│       │   ├── SyncPage.tsx     # Sincronización y control de cambios SHA-256
│       │   └── UsersPage.tsx    # Administración de usuarios y roles
│       ├── services/            # Clientes HTTP Axios
│       │   ├── api.ts
│       │   ├── chat.ts
│       │   ├── documents.ts
│       │   ├── sync.ts
│       │   └── users.ts
│       ├── types/               # Tipos e interfaces TypeScript
│       │   └── index.ts
│       └── utils/               # Helpers frontend
│           ├── auth.ts
│           └── fixEncoding.ts   # Corrector de mojibake y UTF-8
├── documents/                   # Directorio físico de documentos (.pdf, .docx, .html)
└── chroma_data/                 # Almacén vectorial persistente de ChromaDB
```

---

## Referencia de la API REST

### Autenticación y Usuarios
| Método | Endpoint | Descripción | Acceso |
| :--- | :--- | :--- | :---: |
| `POST` | `/auth/login` | Inicio de sesión (Email + Contraseña). Rate limit: 10/min. | Público |
| `GET` | `/auth/me` | Obtiene el perfil del usuario autenticado | Autenticado |
| `GET` | `/users` | Lista todos los usuarios registrados | Admin |
| `POST` | `/users` | Registra un nuevo usuario con rol (`admin` / `empleado`) | Admin |
| `PUT` | `/users/{id}` | Actualiza datos, rol o estado de un usuario | Admin |
| `DELETE` | `/users/{id}` | Elimina un usuario del sistema | Admin |

### Gestión Documental y Sincronización
| Método | Endpoint | Descripción | Acceso |
| :--- | :--- | :--- | :---: |
| `GET` | `/documents` | Lista los documentos registrados y activos | Todos |
| `GET` | `/documents/stats` | Métricas en vivo (chunks, dimensiones, modelo LLM y embedding) | Todos |
| `POST` | `/documents/upload` | Carga e indexa un documento (`.pdf`, `.docx`, `.html`) | Admin |
| `GET` | `/documents/{id}` | Obtiene metadatos de un documento específico | Todos |
| `DELETE` | `/documents/{id}` | Elimina documento físico, registro en BD y vectores en ChromaDB | Admin |
| `POST` | `/documents/sync` | Sincronización incremental de archivos físicos por hash SHA-256 | Admin |
| `POST` | `/documents/reindex` | Reindexación total de la base vectorial desde `./documents/` | Admin |

### Chat y Consultas RAG
| Método | Endpoint | Descripción | Acceso |
| :--- | :--- | :--- | :---: |
| `POST` | `/chat` | Consulta síncrona basada en RAG (`rag` o `search`) | Todos |
| `POST` | `/chat/stream` | Consulta con streaming en tiempo real vía SSE. Rate limit: 30/min. | Todos |
| `GET` | `/chat/health/llm` | Verifica disponibilidad, modelo y estado del servidor LLM | Todos |
| `GET` | `/chat/conversations` | Lista las conversaciones del usuario autenticado | Todos |
| `GET` | `/chat/conversations/{id}` | Obtiene el historial completo de mensajes de un chat | Todos |
| `DELETE` | `/chat/conversations/{id}` | Elimina una conversación y sus mensajes asociados | Todos |

### Sistema y Diagnóstico
| Método | Endpoint | Descripción | Acceso |
| :--- | :--- | :--- | :---: |
| `GET` | `/` | Información general de la API | Público |
| `GET` | `/health` | Health check con timestamp en UTC | Público |
| `GET` | `/docs` | Documentación interactiva Swagger UI | Público |

---

## Variables de Entorno (.env)

A continuación se detalla la configuración vigente del archivo `.env`:

```ini
# =======================================================
# PolicyLens-AI - Variables de Entorno de Configuración
# =======================================================

# --- Servidor LLM (Ollama o API compatible con OpenAI) ---
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=phi4-mini
LLM_API_KEY=ollama

# --- Modelo de Embeddings (Ollama / Qwen3-Embedding) ---
# qwen3-embedding:0.6b: 1024 dimensiones, ventana de 32k tokens, #1 MTEB multilingüe
EMBEDDING_MODEL=qwen3-embedding:0.6b

# --- Base de datos relacional SQLite / PostgreSQL ---
DATABASE_URL=sqlite:///./sql_app.db

# --- Almacenamiento de base vectorial ChromaDB ---
CHROMA_PATH=./chroma_data

# --- Directorio físico de documentos corporativos ---
DOCUMENTS_DIR=./documents

# --- Configuración de CORS (orígenes permitidos separados por coma) ---
CORS_ORIGINS=http://localhost:5173,http://localhost:80,http://localhost

# --- Re-ranking con Cross-Encoder (Opcional) ---
USE_CROSS_ENCODER=false

# --- Credenciales de Administrador inicial ---
DEFAULT_ADMIN_EMAIL=admin@policylens.com
DEFAULT_ADMIN_PASSWORD=admin123
```

---

## Seguridad y Control de Acceso

1. **Control de Acceso Basado en Roles (RBAC):**
   * `admin`: Acceso total al panel de documentos, subida de normativas, sincronización física, reindexación y administración de usuarios.
   * `empleado`: Acceso restringido al centro de consultas, historial propio y lectura de fuentes.
2. **Protección Contra Abusos (Rate Limiting):**
   * Implementado con `slowapi` limitando peticiones por IP en login (10/min) y streaming de chat (30/min).
3. **Prevención de Ataques Path Traversal:**
   * Sanitización estricta de nombres de archivo mediante `os.path.basename` antes de operaciones de escritura en disco.
4. **Registro de Auditoría (Audit Logs):**
   * Tabla relacional `audit_logs` que registra acciones críticas (`LOGIN_SUCCESS`, `LOGIN_FAILED`, `DOCUMENT_UPLOAD`, `DOCUMENT_DELETE`) con IP, usuario, recurso y estado.

---

## Pruebas Automatizadas

El proyecto cuenta con una suite completa de pruebas unitarias e integrales con **100% de aprobación (33/33 tests)**:

```bash
# Ejecutar todas las pruebas del backend
.venv/bin/pytest backend/tests/

# Ejecutar pruebas con reporte detallado
.venv/bin/pytest -v backend/tests/

# Validar compilación y tipos del frontend
cd frontend && npm run build
```

### Módulos de Prueba Cubiertos:
* `test_chat_stream.py`: Flujo Server-Sent Events, eventos `start`, `token`, `done` y captura de excepciones.
* `test_contextual_rag.py`: Detección de preguntas dependientes/anáforas, reescritura de queries, detección de cambio de tema y servicio de auditoría.
* `test_core_foundations.py`: Modelos SQLAlchemy, hashing SHA-256, chunking semántico y extracción de PDF, DOCX y HTML.
* `test_documents_and_sync.py`: Validación de subidas, sanitización de nombres, sincronización incremental y reindexación.
* `test_text_cleaner.py`: Normalización de caracteres, formateo de citas corporativas y limpieza de ruido técnico en pasajes.

---

<div align="center">
Desarrollado para la gestión inteligente y accesible de normativas corporativas con Inteligencia Artificial.
</div>

