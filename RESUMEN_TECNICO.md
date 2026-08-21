# Resumen Técnico — PolicyLens AI

Sistema de chatbot/buscador inteligente de políticas y contratos empresariales (RAG) con arquitectura 100% local.

---

## 1. ESTRUCTURA Y ARCHIVOS

```
PolicyLens-AI/
├── backend/
│   ├── main.py                  # App FastAPI: lifespan (crea tablas + admin default), CORS, registra routers
│   ├── database.py              # Engine SQLAlchemy + SessionLocal (SQLite)
│   ├── models/                  # ORM: document.py, conversation.py, user.py
│   ├── schemas/                 # Esquemas Pydantic: user.py, document.py, chat.py
│   ├── routers/
│   │   ├── auth.py              # POST /auth/login, GET /auth/me (auth simple en texto plano)
│   │   ├── users.py             # CRUD de usuarios con roles (admin/empleado)
│   │   ├── documents.py         # GET/POST upload/DELETE documentos (borra archivo físico)
│   │   ├── sync.py              # POST /documents/sync — sincroniza carpeta ./documents con BD+Chroma
│   │   └── chat.py              # POST /chat, gestión de conversaciones
│   ├── services/
│   │   ├── rag.py               # Orquestador RAG: búsqueda híbrida, scoring, prompt, respuesta ⭐
│   │   ├── llm.py               # LLMService: API compatible OpenAI (NVIDIA NIM)
│   │   ├── embeddings.py        # EmbeddingService: local (sentence-transformers) o API NVIDIA
│   │   ├── documents.py         # procesar_documento(): extracción → hash → chunking → SQLite
│   │   └── auth.py              # authenticate_user (comparación texto plano)
│   ├── utils/
│   │   ├── pdf.py               # extraer_texto_pdf (PyMuPDF)
│   │   ├── docx.py              # extraer_texto_docx (python-docx)
│   │   ├── html.py              # extraer_texto_html (html.parser stdlib)
│   │   ├── chunking.py          # dividir_texto + crear_chunks_con_metadata
│   │   └── hashing.py           # calcular_hash (SHA-256)
│   └── tests/                   # pytest con mocks de servicios externos
├── frontend/                    # React 19 + Vite + TypeScript + Tailwind CSS 4
├── documents/                   # Carpeta física de documentos (.pdf/.docx/.html)
├── chroma_data/                 # Persistencia de ChromaDB
├── sql_app.db                   # Base de datos SQLite
├── requirements.txt             # Dependencias Python
└── .env                         # Configuración (LLM_API_KEY, LLM_MODEL, etc.)
```

---

## 2. PROCESAMIENTO Y FORMATO DE DOCUMENTOS

**Formatos soportados:** `.pdf`, `.docx`, `.html`, `.htm`

**Librerías de extracción** (sin conversión a Markdown — se extrae texto plano):

| Formato | Librería | Archivo |
|---|---|---|
| PDF | **PyMuPDF** (`fitz`) — página por página | `utils/pdf.py` |
| DOCX | **python-docx** — por párrafos | `utils/docx.py` |
| HTML | **html.parser** (stdlib) — parser propio `HTMLTextExtractor` que filtra `script/style/head` y conserva saltos de párrafo/encabezados | `utils/html.py` |

**Chunking:** Sí, en `utils/chunking.py`:

- `dividir_texto(texto, tamano_chunk=500, overlap=50)` — ventana deslizante por caracteres (500 chars, solapamiento 50), aplicado **por página**.
- `crear_chunks_con_metadata(...)` — agrega `document_id`, `document_name`, `page`, `section`, `chunk_index`.
- Orquestado por `procesar_documento()` en `services/documents.py:118`, que además calcula hash SHA-256 y registra en SQLite (upsert por nombre/hash para evitar duplicados).

---

## 3. MODELOS Y VECTORES

- **Modelo de embeddings:** `sentence-transformers` local **`paraphrase-multilingual-MiniLM-L12-v2`** (384 dimensiones), cargado lazy (`SentenceTransformer`). Fallback de emergencia: vector nulo de 384d si falla. Existe también ruta API no usada por defecto: NVIDIA `nvidia/nv-embedqa-e5-v5` vía `EMBEDDING_MODEL`.
- **Base de datos vectorial:** **ChromaDB** en modo persistente (`PersistentClient(path="chroma_data")`), colección `"documents"` con espacio **cosine**. Auto-reset de la colección si hay conflicto de dimensiones (`rag.py:152`).
- **Metadatos relacionales:** SQLite (SQLAlchemy) para documentos, usuarios, conversaciones y mensajes.

---

## 4. ARQUITECTURA DE BÚSQUEDA Y IA

**Es un sistema RAG completo con dos modos** (`POST /chat`, campo `mode`):

- **`"rag"`** (default): búsqueda semántica + **LLM generativo**.
- **`"search"`**: sin LLM — extracción directa de pasajes clave con re-ranking léxico local (`_formatear_respuesta_solo_embeddings`).

**LLM actual:** NVIDIA NIM `meta/llama-3.1-8b-instruct` vía API (compatible OpenAI), configurado en `.env` (`llm.py`).

**Lógica de búsqueda (híbrida):**

1. Embedding de la pregunta (local) → query a ChromaDB con `top_k=12`.
2. Score combinado: `hybrid_score = cos_sim*100*0.7 + lexical_score*30` (coincidencias léxicas de palabras clave).
3. Filtros de relevancia: `cos_score >= 38` y `hybrid_score >= max(38, top-14)`; deduplicación por documento (máx. 2 chunks al LLM).
4. Detección de cambio de tema y meta-preguntas para manejar historial conversacional (últimos 6 turnos).

**System Prompt** (`llm.py:14`): instruye al modelo a leer todo el contexto, citar exactamente, nunca inventar, responder *"No encontré esa información en los documentos disponibles."* si no hay datos, citar siempre documento/página/sección y responder en el idioma de la pregunta.

---

## 5. INTERFAZ Y DESPLIEGUE

- **Backend:** API REST con **FastAPI** + Uvicorn (`http://localhost:8000`), docs automáticos en `/docs`.
- **Frontend:** **React 19 + Vite + TypeScript + Tailwind CSS 4** (no es Streamlit ni Gradio). Páginas: Login, Chat, Documents (upload), Sync, Users. El proxy de Vite redirige `/api/*` → `http://localhost:8000` (`vite.config.ts:12-18`).
- **Auth:** login simple sin tokens; el frontend guarda `user_id`/`role` en `localStorage`.
- **Despliegue:** SQLite + ChromaDB embebidos, LLM vía API NVIDIA NIM. Sin Docker.

---

## 6. CÓDIGO CLAVE

### Ingesta / Vectorización (`rag.py:92`)

```python
def indexar_documento(self, chunks: List[Dict[str, Any]]) -> None:
    if not chunks:
        return

    ids = []
    documents = []
    metadatas = []

    for chunk in chunks:
        chunk_id = f"doc_{chunk['document_id']}_chunk_{chunk['chunk_index']}"
        ids.append(chunk_id)
        documents.append(chunk["content"])
        metadatas.append({
            "document_id": chunk["document_id"],
            "document_name": chunk["document_name"],
            "page": chunk["page"],
            "section": chunk["section"],
            "chunk_index": chunk["chunk_index"]
        })

    embeddings = self.embedding_service.generar_embeddings_lote(documents, local=True)

    try:
        self.collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas
        )
    except Exception as e:
        if "dimension" in str(e).lower() or "expecting" in str(e).lower():
            self._reset_coleccion()
            self.collection.upsert(
                ids=ids,
                embeddings=embeddings,
                documents=documents,
                metadatas=metadatas
            )
        else:
            raise e
```

### Consulta / Chat (`rag.py:199`, flujo principal)

```python
def preguntar(self, pregunta, db, conversation_id=None, mode="rag"):
    # 1. Recuperar o crear conversación + cargar historial
    # 2. Detectar cambio de tema / meta-preguntas
    # 3. Búsqueda vectorial híbrida
    fragmentos = self.buscar_fragmentos(query_busqueda, top_k=12, local=True)

    # 4. Scoring híbrido: semántico (70%) + léxico (30%)
    for frag in fragmentos:
        cos_sim = round((1 - frag["distance"]) * 100, 1)
        lex_score = sum(1 for p in palabras_pregunta if p in texto_lower) / max(1, len(palabras_pregunta))
        frag["hybrid_score"] = (cos_sim * 0.7) + (lex_score * 30.0)

    # 5. Filtrar relevantes (umbral 38), deduplicar por documento, máx. 2 chunks
    tiene_fragmentos_relevantes = bool(
        fragmentos and
        (fragmentos[0].get("cos_score", 0) >= 35.0 or fragmentos[0].get("hybrid_score", 0) >= 36.0)
    )

    if mode == "search":
        # Extracción directa sin LLM
        respuesta = self._formatear_respuesta_solo_embeddings(pregunta, fragmentos_relevantes)
    else:
        # Modo RAG: generar respuesta con LLM (NVIDIA NIM vía API)
        respuesta = self.llm_service.generar_respuesta(
            pregunta=pregunta,
            contexto=contexto if tiene_fragmentos_relevantes else "",
            fuentes=fuentes_str if tiene_fragmentos_relevantes else None,
            historial=historial_para_llm
        )

    # 6. Persistir mensajes user/assistant en SQLite y retornar
    return {"answer": respuesta, "sources": fuentes, "conversation_id": conversation.id}
```

### Búsqueda vectorial (`rag.py:143`)

```python
def buscar_fragmentos(self, pregunta: str, top_k: int = 5, local: bool = True):
    pregunta_embedding = self.embedding_service.generar_embedding(pregunta, local=local)
    try:
        results = self.collection.query(query_embeddings=[pregunta_embedding], n_results=top_k)
    except Exception as e:
        if "dimension" in str(e).lower() or "expecting" in str(e).lower():
            self._reset_coleccion()   # mismatch de dims (ej. 1024d API vs 384d local)
            return []
        raise e
    ...
```
