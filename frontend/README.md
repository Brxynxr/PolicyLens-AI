# PolicyLens-AI — Frontend (React 19 + TypeScript + Vite)

Interfaz web moderna para la consulta inteligente y administración de normativas empresariales de PolicyLens-AI.

---

## Tecnologías Principales

* **React 19:** Biblioteca principal de componentes con hooks avanzados y streaming SSE.
* **TypeScript 5.x:** Tipado estático estricto para modelos, respuestas de API y estado conversacional.
* **Vite:** Herramienta de compilación ultrarrápida y servidor de desarrollo HMR.
* **Tailwind CSS v4:** Motor de utilidades CSS para diseño corporativo responsivo.
* **React Router DOM v7:** Enrutamiento del lado del cliente con rutas protegidas basadas en roles (`ProtectedRoute`).
* **Axios:** Cliente HTTP para comunicación con la API REST de FastAPI.

---

## Estructura del Código Fuente (`src/`)

```
src/
├── components/          # Componentes modulares y reutilizables
│   ├── ConfirmDialog.tsx# Modal accesible de confirmación para eliminaciones
│   ├── FileUpload.tsx   # Zona drag-and-drop para carga de .pdf, .docx, .html
│   ├── FormattedText.tsx# Renderizador semántico Markdown enriquecido
│   ├── Layout.tsx       # Layout maestro con navegación integrada
│   ├── Sidebar.tsx      # Barra lateral responsiva por rol (admin/empleado)
│   ├── SourceCard.tsx   # Tarjeta de fuentes documentales agrupadas
│   └── UserModal.tsx    # Modal de creación y edición de usuarios
├── pages/               # Vistas principales
│   ├── ChatPage.tsx     # Chat conversacional RAG, streaming y monitores
│   ├── DocumentsPage.tsx# Dashboard de documentos y métricas de ChromaDB
│   ├── LoginPage.tsx    # Inicio de sesión corporativo
│   ├── SyncPage.tsx     # Sincronización física por hash SHA-256
│   └── UsersPage.tsx    # Panel de administración de usuarios (RBAC)
├── services/            # Clientes de API REST
│   ├── api.ts           # Instancia base de Axios e interceptores
│   ├── chat.ts          # Servicios de chat, streaming SSE y conversaciones
│   ├── documents.ts     # CRUD de documentos y estadísticas
│   ├── sync.ts          # Sincronización física y reindexación
│   └── users.ts         # CRUD de usuarios
├── types/               # Definición de tipos e interfaces TypeScript
│   └── index.ts
└── utils/               # Utilidades generales
    ├── auth.ts          # Gestión de sesión en localStorage
    └── fixEncoding.ts   # Corrector de secuencias UTF-8 y mojibake
```

---

## Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo (http://localhost:5173)
npm run dev

# Compilar para producción (Typecheck + Vite build)
npm run build

# Previsualizar el build de producción
npm run preview
```


