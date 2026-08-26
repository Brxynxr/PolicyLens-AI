# PolicyLens-AI — Navegador Inteligente de Politicas y Contratos Internos

Aplicacion web interna que permite a los empleados realizar preguntas en lenguaje natural sobre documentos empresariales (manuales de RRHH, contratos legales, politicas internas) utilizando un sistema RAG (Retrieval-Augmented Generation) con busqueda semantica local.

## Problema

Los empleados pierden horas buscando informacion especifica dentro de manuales de recursos humanos, contratos legales y politicas internas densas y extensas.

## Solucion

Un centro de consultas interno donde cualquier colaborador puede hacer preguntas complejas en lenguaje natural y obtener respuestas precisas acompanadas de las fuentes exactas y fragmentos de los documentos originales consultados.

### Caracteristicas principales

- **Consulta RAG con LLM**: Respuestas naturales generadas por un modelo de lenguaje basado en los documentos indexados
- **Busqueda semantica local**: Fragmentos directos de la base vectorial sin intervencion de LLM (mas rapido)
- **Sistema de roles**: Admin (CRUD documentos, usuarios, sincronizacion) y Empleado (solo consultas)
- **Sincronizacion automatica**: Detecta documentos nuevos o modificados mediante hash SHA-256
- **Soporte multi-formato**: PDF (PyMuPDF), DOCX (python-docx), HTML

## Stack Tecnologico

**Backend:**
- Python 3.12 + FastAPI
- SQLite + SQLAlchemy (metadata)
- ChromaDB (almacenamiento vectorial)
- sentence-transformers (embeddings locales)
- PyMuPDF (extraccion de PDF)
- python-docx (extraccion de DOCX)

**Frontend:**
- React 19 + TypeScript
- Tailwind CSS v4
- Vite
- React Router

**IA:**
- LLM: Compatible con NVIDIA NIM API o modelos locales vía Ollama (ej. `qwen2.5:3b`, `llama3.2:1b-instruct-q8_0`, `llama3.1:8b`)
- Embeddings: sentence-transformers local (BAAI/bge-m3)

## Instalacion

```bash
# Clonar el repositorio
git clone <url-del-repositorio>
cd PolicyLens-AI

# Crear entorno virtual
python3 -m venv .venv
source .venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus API keys y configuracion de LLM

# Ejecutar backend (desde la raiz del proyecto)
uvicorn backend.main:app --reload

# NOTA: El primer arranque descarga el modelo de embeddings (~2.3 GB). Es normal.
# Las tablas y el usuario admin se crean automaticamente al iniciar el servidor.

# INDEXAR LOS DOCUMENTOS (paso obligatorio la primera vez):
# La base vectorial viene vacia tras clonar. Sin este paso el chat respondera
# "No encontré información relevante" a todo. Con el backend corriendo:
curl -X POST http://localhost:8000/documents/sync

# Ejecutar frontend (en otra terminal)
cd frontend
npm install
npm run dev
```

## Estructura del Proyecto

```
PolicyLens-AI/
├── backend/
│   ├── main.py              # Punto de entrada FastAPI + lifespan
│   ├── database.py          # Configuracion SQLite
│   ├── models/
│   │   ├── document.py      # Modelo de documentos
│   │   ├── conversation.py  # Modelo de conversaciones
│   │   └── user.py          # Modelo de usuarios
│   ├── schemas/
│   │   ├── chat.py          # Schemas de chat
│   │   ├── document.py      # Schemas de documentos
│   │   └── user.py          # Schemas de usuarios
│   ├── services/
│   │   ├── rag.py           # Orquestacion RAG (modo LLM + modo embeddings)
│   │   ├── documents.py     # Gestion de documentos
│   │   ├── embeddings.py    # Embeddings (API + local)
│   │   ├── llm.py           # Integracion con LLM
│   │   └── auth.py          # Servicio de autenticacion
│   ├── routers/
│   │   ├── documents.py     # Endpoints de documentos
│   │   ├── chat.py          # Endpoints de chat
│   │   ├── sync.py          # Endpoint de sincronizacion
│   │   ├── auth.py          # Endpoints de login
│   │   └── users.py         # Endpoints de usuarios
│   └── utils/
│       ├── pdf.py           # Extraccion de PDF
│       ├── docx.py          # Extraccion de DOCX
│       ├── html.py          # Extraccion de HTML
│       ├── chunking.py      # Fragmentacion de texto
│       └── hashing.py       # Hash SHA-256
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.tsx      # Barra lateral dinamica por rol
│   │   │   ├── Layout.tsx       # Layout principal
│   │   │   ├── ChatMessage.tsx   # Mensaje de chat
│   │   │   ├── SourceCard.tsx    # Card de fuentes
│   │   │   ├── DocumentCard.tsx  # Card de documentos
│   │   │   ├── FileUpload.tsx    # Subida de archivos
│   │   │   └── UserModal.tsx     # Modal crear/editar usuario
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx     # Pagina de login
│   │   │   ├── ChatPage.tsx      # Chat con selector de modo
│   │   │   ├── DocumentsPage.tsx # Gestion de documentos
│   │   │   ├── UsersPage.tsx     # Gestion de usuarios
│   │   │   └── SyncPage.tsx      # Sincronizacion
│   │   ├── services/
│   │   │   ├── api.ts            # Instancia axios
│   │   │   ├── chat.ts           # Servicio de chat
│   │   │   ├── documents.ts      # Servicio de documentos
│   │   │   ├── users.ts          # Servicio de usuarios
│   │   │   └── sync.ts           # Servicio de sincronizacion
│   │   ├── types/index.ts        # Tipos TypeScript
│   │   ├── App.tsx               # Rutas y proteccion
│   │   └── main.tsx              # Entrada React
│   └── package.json
├── documents/               # Documentos cargados
├── chroma_data/             # Datos de ChromaDB
├── requirements.txt
├── .env
└── README.md
```

## API Endpoints

### Autenticacion

| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| POST | `/auth/login` | Login simple | Publico |
| GET | `/auth/me` | Obtener usuario por ID | Publico |

### Usuarios

| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/users` | Listar usuarios | Admin |
| POST | `/users` | Crear usuario | Admin |
| PUT | `/users/{id}` | Editar usuario | Admin |
| DELETE | `/users/{id}` | Eliminar usuario | Admin |

### Documentos

| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| GET | `/documents` | Listar documentos | Admin |
| POST | `/documents/upload` | Subir documento | Admin |
| GET | `/documents/{id}` | Obtener documento | Admin |
| DELETE | `/documents/{id}` | Eliminar documento | Admin |
| POST | `/documents/sync` | Sincronizar documentos | Admin |

### Chat

| Metodo | Ruta | Descripcion | Rol |
|--------|------|-------------|-----|
| POST | `/chat` | Enviar pregunta (síncrono) | Todos |
| POST | `/chat/stream` | Enviar pregunta con streaming en tiempo real (SSE) | Todos |
| GET | `/chat/conversations` | Listar conversaciones | Todos |
| GET | `/chat/conversations/{id}` | Obtener conversacion | Todos |
| DELETE | `/chat/conversations/{id}` | Eliminar conversacion | Todos |

### Otros

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| GET | `/health` | Verificar estado del servidor |

## Modos de Consulta

### RAG + LLM (modo por defecto)

```
Pregunta -> Embedding local -> ChromaDB -> Fragmentos relevantes -> LLM (API) -> Respuesta natural
```

- Velocidad: ~1-5 segundos (depende de la API)
- Genera respuestas naturales interpretadas por el LLM
- Siempre cita las fuentes utilizadas

### Solo Embeddings (modo rapido)

```
Pregunta -> Embedding local -> ChromaDB -> Fragmentos directos
```

- Velocidad: ~20-30ms (todo local)
- Muestra los fragmentos mas relevantes directamente
- Sin interpretacion de LLM
- Ideal para verificar que la busqueda semantica funciona correctamente

## Variables de Entorno

El archivo `.env` debe contener:

```
# Base de datos
DATABASE_URL=sqlite:///./sql_app.db
CORS_ORIGINS=http://localhost:5173

# LLM (NVIDIA NIM o Local via Ollama):
LLM_API_KEY=ollama
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=qwen2.5:3b

# Embeddings locales (sentence-transformers). bge-m3: ~2.3 GB de descarga inicial,
# 1024 dimensiones. Si cambias el modelo, regenera el indice con:
#   python -m backend.scripts.reindexar_todo
# Si cambias el modelo, regenera el indice con:
#   python -m backend.scripts.reindexar_todo
EMBEDDING_MODEL_LOCAL=BAAI/bge-m3
```

## Credenciales por Defecto

| Campo | Valor |
|-------|-------|
| Email | admin@policylens.com |
| Password | admin123 |
| Rol | admin |


