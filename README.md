# Navegador Inteligente de Políticas y Contratos Internos

Aplicación web interna que permite a los empleados realizar preguntas en lenguaje natural sobre documentos empresariales (manuales de RRHH, contratos legales, políticas internas) utilizando un sistema RAG (Retrieval-Augmented Generation).

## Problema

Los empleados pierden tiempo buscando información específica dentro de documentos extensos y difíciles de consultar.

## Solución

Sistema RAG que:
1. Carga documentos PDF y DOCX
2. Extrae y fragmenta el texto
3. Genera embeddings y los almacena en ChromaDB
4. Responde preguntas usando los documentos como contexto
5. Muestra las fuentes exactas utilizadas

## Stack Tecnológico

**Backend:**
- Python + FastAPI
- SQLite (metadata)
- ChromaDB (almacenamiento vectorial)
- PyMuPDF (extracción de PDF)
- python-docx (extracción de DOCX)

**Frontend:**
- React + TypeScript
- Tailwind CSS
- Vite

**IA:**
- Proveedor LLM compatible con OpenAI (desacoplado)

## Instalación

```bash
# Clonar el repositorio
git clone <url-del-repositorio>
cd proyecto3

# Crear entorno virtual
python3 -m venv .venv
source .venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus API keys

# Ejecutar backend
cd backend
uvicorn main:app --reload

# Ejecutar frontend (en otra terminal)
cd frontend
npm install
npm run dev
```

## Estructura del Proyecto

```
proyecto3/
├── backend/
│   ├── main.py              # Punto de entrada FastAPI
│   ├── database.py          # Configuración SQLite
│   ├── models/
│   │   ├── document.py      # Modelo de documentos
│   │   └── conversation.py  # Modelo de conversaciones
│   ├── services/
│   │   ├── rag.py           # Orquestación RAG
│   │   ├── documents.py     # Gestión de documentos
│   │   ├── embeddings.py    # Generación de embeddings
│   │   └── llm.py           # Integración con LLM
│   ├── routers/
│   │   ├── documents.py     # Endpoints de documentos
│   │   ├── chat.py          # Endpoints de chat
│   │   └── sync.py          # Endpoint de sincronización
│   └── utils/
│       ├── pdf.py           # Extracción de PDF
│       ├── chunking.py      # Fragmentación de texto
│       └── hashing.py       # Hash SHA-256
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes reutilizables
│   │   ├── pages/           # Páginas de la aplicación
│   │   ├── services/        # Servicios API
│   │   ├── App.tsx          # Componente raíz
│   │   └── main.tsx         # Punto de entrada React
│   └── package.json
├── documents/               # Documentos cargados
├── chroma_data/             # Datos de ChromaDB
├── requirements.txt
├── .env
└── README.md
```

## API Endpoints

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

## Desarrollado por

- Integrante 1
- Integrante 2
- Integrante 3
