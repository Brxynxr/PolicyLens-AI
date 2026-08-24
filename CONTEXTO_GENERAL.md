# CONTEXTO COMPLETO — NAVEGADOR INTELIGENTE DE POLÍTICAS Y CONTRATOS INTERNOS

## 1. Descripción del Proyecto

Sistema RAG (Retrieval-Augmented Generation) que permite a empleados de una compañía realizar preguntas en lenguaje natural sobre documentos empresariales (manuales de RRHH, contratos legales, políticas internas).

**Es un proyecto ACADÉMICO, NO de producción.**

## 2. Objetivo

1. Cargar documentos PDF y DOCX
2. Extraer su contenido
3. Dividirlo en chunks
4. Generar embeddings
5. Indexarlo en ChromaDB
6. Hacer preguntas sobre los documentos
7. Recuperar los fragmentos relevantes
8. Generar una respuesta mediante un LLM
9. Mostrar las fuentes exactas
10. Detectar documentos nuevos o modificados
11. Actualizar el índice mediante sincronización
12. Presentar todo mediante una interfaz React + Tailwind

## 3. Stack Tecnológico

**Backend:**
- Python 3.12
- FastAPI
- SQLite + SQLAlchemy
- ChromaDB
- PyMuPDF (PDF)
- python-docx (DOCX)
- httpx
- Pydantic
- python-dotenv

**Frontend:**
- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Axios

**IA (desacoplada):**
- Proveedor LLM compatible con OpenAI (NVIDIA NIM)
- Proveedor de Embeddings compatible con OpenAI

## 4. Variables de Entorno

```
LLM_API_KEY=
LLM_BASE_URL=https://integrate.api.nvidia.com/v1
LLM_MODEL=meta/llama-3.1-8b-instruct
EMBEDDING_MODEL=nvidia/nv-embedqa-e5-v5
```

## 5. Arquitectura

```
┌─────────────────────────────────────────────────┐
│                  FRONTEND (React)                │
│  Chat │ Documentos │ Sincronización              │
└──────────────────┬──────────────────────────────┘
                   │ HTTP (axios)
┌──────────────────▼──────────────────────────────┐
│               BACKEND (FastAPI)                  │
│  Routers → Services → Utils                      │
└──────┬───────────────┬──────────────────────────┘
       │               │
┌──────▼──────┐ ┌──────▼──────┐ ┌────────────────┐
│   SQLite    │ │  ChromaDB   │ │  LLM (externo) │
│  (metadata) │ │ (vectores)  │ │  API OpenAI    │
└─────────────┘ └─────────────┘ └────────────────┘
```

## 6. Flujo del Sistema

### Ingesta de Documentos
```
Documento → Detectar tipo → Extraer texto → Limpiar → Dividir en chunks → Generar embeddings → Guardar en ChromaDB → Guardar metadata en SQLite
```

### Consulta RAG
```
Pregunta → Generar embedding → Buscar en ChromaDB → Top K resultados → Construir contexto → Enviar al LLM → Generar respuesta → Mostrar respuesta + fuentes
```

## 7. Modelos de Base de Datos

### Document
```python
class Document:
    id: int              # Primary key
    name: str            # Nombre interno
    original_name: str   # Nombre original del archivo
    type: str            # PDF o DOCX
    hash: str            # SHA-256 del archivo
    size: int            # Tamaño en bytes
    upload_date: datetime
    status: str          # active, deleted
```

### Conversation
```python
class Conversation:
    id: int              # Primary key
    created_at: datetime
    messages: List[Message]
```

### Message
```python
class Message:
    id: int              # Primary key
    conversation_id: int # FK a Conversation
    role: str            # user o assistant
    content: str
    created_at: datetime
```

## 8. Endpoints API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Verificar estado del servidor |
| GET | `/documents` | Listar documentos |
| POST | `/documents/upload` | Subir documento |
| GET | `/documents/{id}` | Obtener documento |
| DELETE | `/documents/{id}` | Eliminar documento |
| POST | `/documents/sync` | Sincronizar documentos |
| POST | `/chat` | Enviar pregunta |
| GET | `/conversations` | Listar conversaciones |
| GET | `/conversations/{id}` | Obtener conversación |

## 9. Estructura del Proyecto

```
proyecto3/
├── backend/
│   ├── main.py              # ✓ COMPLETADO
│   ├── database.py          # ✓ COMPLETADO
│   ├── models/
│   │   ├── document.py      # ✓ COMPLETADO
│   │   └── conversation.py  # ✓ COMPLETADO
│   ├── services/
│   │   ├── rag.py           # PENDIENTE
│   │   ├── documents.py     # PENDIENTE
│   │   ├── embeddings.py    # PENDIENTE
│   │   └── llm.py           # PENDIENTE
│   ├── routers/
│   │   ├── documents.py     # PENDIENTE
│   │   ├── chat.py          # PENDIENTE
│   │   └── sync.py          # PENDIENTE
│   └── utils/
│       ├── pdf.py           # PENDIENTE
│       ├── chunking.py      # PENDIENTE
│       └── hashing.py       # PENDIENTE
├── frontend/                # PENDIENTE
├── documents/
├── chroma_data/
├── requirements.txt         # ✓ COMPLETADO
├── .env                     # ✓ COMPLETADO
├── .env.example             # ✓ COMPLETADO
├── .gitignore               # ✓ COMPLETADO
└── README.md                # ✓ COMPLETADO
```

---

# TAREAS POR INTEGRANTE

---

## INTEGRANTE 1: Backend & Core Engineer

**Responsable:** Lógica de negocio, robustez, bases de datos, gestión de estados.

### Tarea 1: backend/utils/pdf.py

Crear función `extraer_texto_pdf(ruta_archivo)`:
- Abrir PDF con PyMuPDF (fitz)
- Extraer texto de cada página
- Retornar lista de diccionarios: `[{"page": numero_pagina, "text": "texto"}]`
- Manejar errores de archivos corruptos

### Tarea 2: backend/utils/chunking.py

Crear función `dividir_texto(texto, tamano_chunk=500, overlap=50)`:
- Dividir texto en fragmentos del tamaño especificado
- Usar overlap para no perder contexto
- Retornar lista de strings

Crear función `crear_chunks_con_metadata(document_id, document_name, page, section, chunks)`:
- Asignar metadata a cada chunk
- Retornar lista de diccionarios con: document_id, document_name, page, section, chunk_index, content

### Tarea 3: backend/utils/hashing.py

Crear función `calcular_hash(ruta_archivo)`:
- Leer archivo en modo binario
- Calcular SHA-256
- Retornar hash como string hexadecimal

### Tarea 4: backend/services/documents.py

Crear función `procesar_documento(ruta_archivo, nombre_original, db)`:
- Detectar tipo (PDF o DOCX)
- Extraer texto según tipo
- Dividir en chunks
- Retornar chunks listos para embeddings

Crear funciones CRUD:
- `guardar_documento(db, nombre, nombre_original, tipo, hash, tamaño, estado)`
- `listar_documentos(db)`
- `obtener_documento(db, documento_id)`
- `eliminar_documento(db, documento_id)`

### Tarea 5: backend/routers/documents.py

Crear router con endpoints:
- `GET /documents` → listar documentos
- `POST /documents/upload` → subir archivo (UploadFile de FastAPI)
- `GET /documents/{id}` → obtener documento
- `DELETE /documents/{id}` → eliminar documento
- Usar Pydantic schemas para request/response

### Tarea 6: backend/routers/sync.py

Crear endpoint `POST /documents/sync`:
- Escanear carpeta `./documents/`
- Comparar hashes con BD
- Identificar: nuevos, modificados, sin cambios
- Procesar solo nuevos y modificados
- Retornar resumen de sincronización

---

## INTEGRANTE 2: AI & Data Pipeline Architect

**Responsable:** Integración con IA, flujos de procesamiento, optimización, estrategia de ingesta/contexto.

### Tarea 1: backend/services/embeddings.py

Crear clase `EmbeddingService`:
- Usar httpx para API compatible con OpenAI
- Leer variables de entorno: LLM_BASE_URL, EMBEDDING_MODEL
- Método `generar_embedding(texto)` → retorna vector
- Método `generar_embeddings_lote(textos)` → retorna lista de vectores
- Desacoplada del proveedor

### Tarea 2: backend/services/llm.py

Crear clase `LLMService`:
- Usar httpx para API compatible con OpenAI
- Leer variables de entorno: LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
- Método `generar_respuesta(prompt, contexto)` → retorna string
- System prompt:
  * Responder SOLO basándose en el contexto
  * No inventar información
  * Si no tiene la respuesta, indicarlo
  * Incluir fuentes
- Desacoplada del proveedor

### Tarea 3: backend/services/rag.py

Crear clase `RAGService`:
- Método `preguntar(pregunta, db)`:
  1. Generar embedding de la pregunta
  2. Buscar en ChromaDB (top_k=5)
  3. Construir contexto
  4. Enviar contexto + pregunta al LLM
  5. Retornar: respuesta, fuentes
- Método `indexar_documento(chunks, embeddings)` → guardar en ChromaDB
- Método `eliminar_documento(document_id)` → eliminar de ChromaDB

### Tarea 4: backend/routers/chat.py

Crear router con endpoints:
- `POST /chat` → recibe pregunta, retorna respuesta + fuentes
- `GET /conversations` → listar conversaciones
- `GET /conversations/{id}` → obtener conversación con mensajes
- Guardar cada pregunta y respuesta en BD
- Usar Pydantic schemas

### Estructura ChromaDB

- Colección: "documents"
- Metadata por chunk: document_id, document_name, page, section, chunk_index
- Content: texto del chunk

---

## INTEGRANTE 3: Frontend & Integration Lead

**Responsable:** Interfaz de usuario, integración frontend-backend.

### Tarea 1: Configuración del proyecto

Crear archivos:
- `frontend/package.json` — dependencias: react, react-dom, react-router-dom, axios, tailwindcss
- `frontend/index.html` — HTML de entrada para Vite
- `frontend/tsconfig.json` — configuración TypeScript
- `frontend/vite.config.ts` — configuración Vite con proxy a backend
- `frontend/tailwind.config.js` — configuración Tailwind
- `frontend/postcss.config.js` — PostCSS para Tailwind
- `frontend/src/index.css` — estilos globales con directivas Tailwind

### Tarea 2: Estructura base

- `frontend/src/main.tsx` — entrada React con BrowserRouter
- `frontend/src/App.tsx` — layout con sidebar y rutas

### Tarea 3: Componentes reutilizables

- `frontend/src/components/Sidebar.tsx` — barra lateral de navegación
- `frontend/src/components/ChatMessage.tsx` — mensaje de usuario o IA
- `frontend/src/components/SourceCard.tsx` — card para fuentes
- `frontend/src/components/DocumentCard.tsx` — card para documentos
- `frontend/src/components/FileUpload.tsx` — botón para subir archivos

### Tarea 4: Páginas

- `frontend/src/pages/ChatPage.tsx` — interfaz de chat con campo de pregunta, mensajes y fuentes
- `frontend/src/pages/DocumentsPage.tsx` — lista de documentos con botón para subir
- `frontend/src/pages/SyncPage.tsx` — botón de sincronizar y mostrar resultados

### Tarea 5: Servicios API

- `frontend/src/services/api.ts` — instancia axios con baseURL del backend
- `frontend/src/services/documents.ts` — funciones: listarDocumentos(), subirDocumento(), eliminarDocumento()
- `frontend/src/services/chat.ts` — funciones: enviarPregunta(), listarConversaciones(), obtenerConversacion()
- `frontend/src/services/sync.ts` — funciones: sincronizarDocumentos()

### Tarea 6: Diseño

- Colores: slate/gray para fondos, blue para acentos
- Sidebar fijo a la izquierda
- Responsive (mobile-first)
- Cards con sombras sutiles
- Tailwind CSS para todo

### Estructura de respuesta del chat

```json
{
  "answer": "Respuesta del LLM...",
  "sources": [
    {
      "document": "manual_rrhh.pdf",
      "page": 32,
      "section": "Vacaciones",
      "content": "Fragmento utilizado..."
    }
  ]
}
```

---

# REGLAS GENERALES

1. **Proyecto académico**: No sobreingeniería, no microservicios, no Redis, no Kubernetes
2. **Simplicidad**: Código claro, modular, fácil de explicar
3. **Desacoplamiento**: El proveedor LLM debe poder cambiarse fácilmente
4. **RAG**: El LLM responde SOLO con contexto recuperado, nunca inventa
5. **Fuentes**: Siempre mostrar documento, página, sección y fragmento
6. **Errores**: Manejar errores comunes, nunca mostrar stack traces al usuario
7. **Docs**: Leer archivos existentes antes de escribir código nuevo
