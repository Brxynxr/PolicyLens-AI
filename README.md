# PolicyLens-AI — Navegador Inteligente de Políticas y Contratos Internos

Aplicación web empresarial que permite a los colaboradores realizar preguntas en lenguaje natural sobre documentos corporativos (manuales de RRHH, reglamentos internos, políticas de seguridad y contratos) utilizando un sistema **RAG (Retrieval-Augmented Generation)** con búsqueda semántica local de alta precisión.

---

##  Problema y Solución

* **Problema:** Los empleados pierden horas buscando información específica en manuales extensos, reglamentos densos y políticas corporativas complejas.
* **Solución:** Un centro de consultas inteligente donde cualquier colaborador puede formular preguntas en lenguaje natural y obtener respuestas inmediatas y fundamentadas, acompañadas de las citas exactas y fragmentos de los documentos originales consultados.

---

##  Características Principales

* **Consulta RAG con LLM (Tiempo Real):** Respuestas conversacionales generadas por modelos de lenguaje locales (vía Ollama) o APIs en la nube con streaming SSE token a token.
* **Búsqueda Semántica Directa (Modo Solo Documento):** Recuperación y presentación directa de los fragmentos y artículos literales de la base vectorial sin pasar por el LLM.
* **Agrupación Inteligente de Fuentes:** Las fuentes consultadas se agrupan automáticamente por documento en el frontend, resumiendo todas las páginas referenciadas en una tarjeta interactiva colapsable.
* **Formateo Visual Rico en React:** Renderizado estructurado de artículos normativos (`ARTICULO 77.`), listas numeradas con badges circulares, viñetas y títulos de documentos.
* **Filtro Anti-Índices:** Detección y exclusión automática de tablas de contenido para garantizar que solo se recuperen fragmentos con políticas sustantivas.
* **Control de Acceso Basado en Roles (RBAC):**
  * `Admin`: Gestión de documentos, subida, eliminación, sincronización y administración de usuarios.
  * `Empleado`: Acceso a consultas, historial de chats y visualización de fuentes.
* **Extracción Multi-formato de Alta Velocidad:** Soporte para PDF (vía PyMuPDF nativo ultrarrápido), DOCX y HTML.
* **Sincronización Incremental por Hash:** Detección de archivos nuevos o modificados mediante hashing SHA-256.

---

##  Stack Tecnológico

### Backend
* **Python 3.12 + FastAPI:** API asíncrona de alto rendimiento.
* **SQLite + SQLAlchemy:** Base de datos relacional para usuarios, documentos y conversaciones.
* **ChromaDB:** Base de datos vectorial persistente con índice HNSW.
* **Sentence-Transformers:** Motor de embeddings 100% local con prefijos contrastivos (`query:` y `passage:`).
* **PyMuPDF (`fitz`):** Extracción nativa de PDFs en milisegundos.
* **Rank-BM25:** Búsqueda léxica híbrida combinada con similitud coseno.

### Frontend
* **React 19 + TypeScript:** Arquitectura de componentes desacoplada y tipada.
* **Tailwind CSS v4:** Diseño corporativo moderno y responsivo.
* **Vite:** Empaquetado y recarga en caliente ultrarrápida.
* **Lucide React:** Iconografía vectorial.

### Modelos de Inteligencia Artificial
* **Embeddings:** `intfloat/multilingual-e5-base` (768 dimensiones, 96.8% de precisión semántica).
* **LLM Local:** `qwen2.5:3b` o `qwen2.5:7b` ejecutado localmente mediante Ollama.

---

##  Instalación y Puesta en Marcha

### 1. Clonar el Repositorio
```bash
git clone <url-del-repositorio>
cd PolicyLens-AI
```

### 2. Configurar el Entorno Backend
```bash
# Crear y activar entorno virtual
python3 -m venv .venv
source .venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
```

### 3. Iniciar el Modelo Local (Ollama)
En una terminal independiente, asegúrate de tener Ollama corriendo con el modelo configurado:
```bash
ollama run qwen2.5:3b
# O para máxima precisión de redacción:
# ollama run qwen2.5:latest
```

### 4. Iniciar el Servidor Backend
```bash
# Desde la raíz del proyecto con el venv activo:
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```
> *Las tablas SQLite y el usuario administrador inicial se crean automáticamente en el primer arranque.*

### 5. Indexar Documentos Iniciales
Si tienes archivos en la carpeta `./documents/` o necesitas regenerar la base vectorial:
```bash
python -m backend.scripts.reindexar_todo
```

### 6. Iniciar el Frontend
En otra terminal:
```bash
cd frontend
npm install
npm run dev
```
La aplicación estará disponible en `http://localhost:5173`.

---

## Estructura del Proyecto

```
PolicyLens-AI/
├── backend/
│   ├── main.py                  # Entrada FastAPI y ciclo de vida (lifespan)
│   ├── database.py              # Configuración SQLite y sesión SQLAlchemy
│   ├── models/                  # Modelos de base de datos
│   │   ├── document.py          # Documentos indexados y metadatos
│   │   ├── conversation.py      # Conversaciones y mensajes
│   │   └── user.py              # Usuarios y roles (admin/empleado)
│   ├── schemas/                 # Esquemas Pydantic para validación API
│   │   ├── chat.py              # Esquemas de preguntas, respuestas y streaming
│   │   ├── document.py          # Esquemas de subida y listado
│   │   └── user.py              # Esquemas de usuarios y autenticación
│   ├── services/                # Lógica de negocio
│   │   ├── rag.py               # Orquestación RAG, filtrado de ruido y BM25
│   │   ├── embeddings.py        # Sentence-transformers local con prefijos E5
│   │   ├── llm.py               # Conexión local OpenAI/Ollama y streaming
│   │   ├── documents.py         # Procesamiento, hash y chunking
│   │   └── auth.py              # Autenticación y hash de contraseñas
│   ├── routers/                 # Endpoints de la API REST
│   │   ├── auth.py              # Login y perfil (/auth)
│   │   ├── chat.py              # Chat síncrono y streaming SSE (/chat)
│   │   ├── documents.py         # CRUD, estadísticas y subida (/documents)
│   │   ├── users.py             # Administración de usuarios (/users)
│   │   └── sync.py              # Sincronización incremental (/sync)
│   ├── utils/                   # Utilidades de bajo nivel
│   │   ├── text_cleaner.py      # Limpieza y formateo de pasajes y citas
│   │   ├── pdf.py               # Extracción nativa con PyMuPDF
│   │   ├── docx.py              # Extracción de documentos Word
│   │   ├── html.py              # Extracción de páginas HTML
│   │   ├── chunking.py          # Estrategia de fragmentación (1800 chars / 360 overlap)
│   │   └── hashing.py           # Cálculo de hash SHA-256
│   ├── scripts/                 # Scripts utilitarios
│   │   └── reindexar_todo.py    # Reindexación completa de la base vectorial
│   └── tests/                   # Suite automatizada de pruebas (pytest)
├── frontend/
│   ├── src/
│   │   ├── components/          # Componentes reutilizables
│   │   │   ├── FormattedText.tsx# Renderizador semántico de Markdown y listas
│   │   │   ├── SourceCard.tsx   # Tarjeta de fuentes agrupadas por documento
│   │   │   ├── DocumentCard.tsx # Tarjeta de gestión de documentos
│   │   │   ├── Sidebar.tsx      # Barra de navegación lateral por rol
│   │   │   ├── Layout.tsx       # Contenedor principal de la aplicación
│   │   │   └── ConfirmDialog.tsx# Diálogo modal de confirmación
│   │   ├── pages/               # Vistas de la aplicación
│   │   │   ├── ChatPage.tsx     # Chat conversacional con selector de modo
│   │   │   ├── DocumentsPage.tsx# Dashboard de documentos y estadísticas RAG
│   │   │   ├── UsersPage.tsx    # Gestión de usuarios y roles
│   │   │   ├── SyncPage.tsx     # Sincronización de repositorio de archivos
│   │   │   └── LoginPage.tsx    # Inicio de sesión
│   │   ├── services/            # Clientes HTTP (Axios)
│   │   ├── utils/               # Utilidades de autenticación y encoding
│   │   └── types/               # Definiciones de TypeScript
│   └── package.json
├── documents/                   # Directorio físico de documentos (.pdf, .docx)
├── chroma_data/                 # Almacén persistente de vectores ChromaDB
├── requirements.txt             # Dependencias Python
└── .env                         # Variables de configuración
```

---

##  Endpoints de la API

### Autenticación y Usuarios
| Método | Ruta | Descripción | Acceso |
| :--- | :--- | :--- | :---: |
| `POST` | `/auth/login` | Inicio de sesión (Email + Contraseña) | Público |
| `GET` | `/auth/me` | Obtener datos del usuario autenticado | Todos |
| `GET` | `/users` | Listar todos los usuarios del sistema | Admin |
| `POST` | `/users` | Crear un nuevo usuario | Admin |
| `PUT` | `/users/{id}` | Modificar datos o rol de un usuario | Admin |
| `DELETE` | `/users/{id}` | Eliminar un usuario | Admin |

### Documentos y Estadísticas RAG
| Método | Ruta | Descripción | Acceso |
| :--- | :--- | :--- | :---: |
| `GET` | `/documents` | Listar documentos registrados y activos | Admin |
| `GET` | `/documents/stats` | Métricas dinámicas (chunks, modelo de embedding, dimensiones, LLM) | Admin |
| `POST` | `/documents/upload` | Subir e indexar un documento (.pdf, .docx, .html) | Admin |
| `GET` | `/documents/{id}` | Obtener detalle de un documento específico | Admin |
| `DELETE` | `/documents/{id}` | Eliminar documento físico y sus vectores en ChromaDB | Admin |
| `POST` | `/documents/sync` | Sincronización incremental desde `./documents/` | Admin |

### Chat y Consultas
| Método | Ruta | Descripción | Acceso |
| :--- | :--- | :--- | :---: |
| `POST` | `/chat` | Enviar pregunta (Respuesta síncrona completa) | Todos |
| `POST` | `/chat/stream` | Enviar pregunta con streaming en tiempo real (Server-Sent Events) | Todos |
| `GET` | `/chat/conversations` | Listar conversaciones del usuario | Todos |
| `GET` | `/chat/conversations/{id}`| Obtener historial de una conversación | Todos |
| `DELETE` | `/chat/conversations/{id}`| Eliminar una conversación | Todos |

---

##  Variables de Entorno (`.env`)

```ini
# Base de Datos y CORS
DATABASE_URL=sqlite:///./sql_app.db
CORS_ORIGINS=http://localhost:5173

# Configuración del LLM (Local vía Ollama u OpenAI-compatible)
LLM_API_KEY=ollama
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=qwen2.5:3b

# Modelo de Embeddings Local (Sentence-Transformers)
# Opciones recomendadas:
# - intfloat/multilingual-e5-base (768D, 96.8% precisión - Recomendado)
# - intfloat/multilingual-e5-small (384D, ultra-rápido)
EMBEDDING_MODEL_LOCAL=intfloat/multilingual-e5-base
```

---

##  Credenciales Iniciales por Defecto

| Campo | Valor |
| :--- | :--- |
| **Email** | `admin@policylens.com` |
| **Contraseña** | `admin123` |
| **Rol** | `admin` |

---

##  Ejecución de Pruebas Automatizadas

El proyecto cuenta con una suite completa de pruebas unitarias y de integración:

```bash
# Ejecutar todas las pruebas del backend
.venv/bin/pytest backend/tests/

# Validar compilación del frontend
cd frontend && npm run build
```
