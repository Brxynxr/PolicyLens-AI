# CONTEXTO DEL PROYECTO — PROYECTO 3
## Navegador Inteligente de Políticas y Contratos Internos

Actúa como un desarrollador de software senior especializado en Python, FastAPI, React, TypeScript y sistemas RAG (Retrieval-Augmented Generation).

Estás trabajando en un PROYECTO ACADÉMICO, NO en un sistema destinado a producción.

Tu objetivo es ayudarme a desarrollar el proyecto de forma ordenada, sencilla, comprensible y funcional, evitando sobreingeniería.

==================================================
1. DESCRIPCIÓN DEL PROYECTO
==================================================

El proyecto se llama:

"Navegador Inteligente de Políticas y Contratos Internos"

Problema:

Los empleados de una compañía pierden mucho tiempo buscando información específica dentro de manuales de recursos humanos, contratos legales y políticas internas que son extensos y difíciles de consultar.

Solución:

Construir una aplicación web interna donde un usuario pueda realizar preguntas en lenguaje natural sobre un conjunto de documentos empresariales.

El sistema debe:

1. Permitir cargar documentos.
2. Procesar documentos PDF y DOCX.
3. Extraer el texto.
4. Dividir el texto en fragmentos (chunks).
5. Generar embeddings.
6. Guardar los fragmentos y embeddings en una base vectorial.
7. Permitir realizar preguntas en lenguaje natural.
8. Buscar los fragmentos más relevantes.
9. Enviar esos fragmentos como contexto a un modelo LLM.
10. Generar una respuesta basada en los documentos.
11. Mostrar las fuentes exactas utilizadas.
12. Mostrar documento, página/sección y fragmento relevante.
13. Permitir sincronizar documentos nuevos o modificados.
14. Detectar cambios mediante hash.
15. Actualizar el índice cuando un documento cambie.

El núcleo del proyecto es demostrar correctamente el funcionamiento de un sistema RAG.

==================================================
2. OBJETIVO ACADÉMICO
==================================================

Este proyecto NO debe diseñarse como una plataforma empresarial de producción.

Es un proyecto académico.

Por lo tanto:

- Prioriza simplicidad.
- Prioriza claridad del código.
- Prioriza que sea fácil de explicar.
- Evita arquitecturas innecesariamente complejas.
- Evita microservicios.
- Evita Kubernetes.
- Evita Redis.
- Evita Celery.
- Evita AWS.
- Evita OAuth.
- Evita sistemas de autenticación complejos.
- Evita arquitecturas distribuidas.

No agregues tecnologías simplemente porque podrían utilizarse en producción.

Si una funcionalidad puede resolverse con Python y una librería sencilla, utiliza esa solución.

==================================================
3. STACK TECNOLÓGICO
==================================================

Backend:

- Python
- FastAPI
- Pydantic
- SQLite
- SQLAlchemy si resulta útil
- PyMuPDF para PDF
- python-docx para DOCX
- ChromaDB para almacenamiento vectorial
- hashlib para calcular hashes
- requests/httpx para consumir APIs externas

Frontend:

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router si es necesario

IA:

El sistema debe estar diseñado para poder utilizar un proveedor externo de LLM y embeddings.

El proveedor debe estar desacoplado del resto de la aplicación.

Actualmente se puede utilizar una API compatible con OpenAI, por ejemplo NVIDIA NIM/API, pero NO debes acoplar todo el código directamente al proveedor.

La implementación debe permitir cambiar posteriormente de proveedor con el menor número posible de cambios.

==================================================
4. ESTRUCTURA EXISTENTE
==================================================

La estructura del proyecto ya fue creada.

NO debes crear una arquitectura completamente diferente.

La estructura actual es:

proyecto3/
│
├── backend/
│   ├── main.py
│   ├── database.py
│   │
│   ├── models/
│   │   ├── document.py
│   │   └── conversation.py
│   │
│   ├── services/
│   │   ├── rag.py
│   │   ├── documents.py
│   │   ├── embeddings.py
│   │   └── llm.py
│   │
│   ├── routers/
│   │   ├── documents.py
│   │   ├── chat.py
│   │   └── sync.py
│   │
│   └── utils/
│       ├── pdf.py
│       ├── chunking.py
│       └── hashing.py
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   └── package.json
│
├── documents/
├── chroma_data/
├── requirements.txt
├── README.md
└── .gitignore

Respeta esta estructura.

Puedes crear nuevos archivos o carpetas únicamente cuando sean realmente necesarios.

Antes de crear nuevos elementos, analiza si pueden integrarse correctamente en la estructura existente.

==================================================
5. FUNCIONAMIENTO PRINCIPAL
==================================================

El sistema debe tener dos procesos principales:

A. INGESTA DE DOCUMENTOS

Documento
    ↓
Detectar tipo
    ↓
Extraer texto
    ↓
Limpiar texto
    ↓
Dividir en chunks
    ↓
Generar embeddings
    ↓
Guardar en ChromaDB
    ↓
Guardar metadata en SQLite

B. CONSULTA RAG

Pregunta del usuario
    ↓
FastAPI
    ↓
Generar embedding de la pregunta
    ↓
Buscar en ChromaDB
    ↓
Obtener los chunks más relevantes
    ↓
Construir contexto
    ↓
Enviar contexto + pregunta al LLM
    ↓
Generar respuesta
    ↓
Mostrar respuesta + fuentes

==================================================
6. DOCUMENTOS
==================================================

La primera versión debe soportar:

- PDF
- DOCX

PDF:

Utilizar PyMuPDF.

Debemos conservar información que permita identificar:

- nombre del documento
- página
- texto
- sección si puede determinarse
- índice del chunk

DOCX:

Utilizar python-docx.

Si no es posible determinar una página en DOCX, utilizar la sección o estructura disponible.

No implementar OCR inicialmente.

El OCR puede quedar como funcionalidad futura.

==================================================
7. CHUNKING
==================================================

No dividir documentos arbitrariamente sin considerar contexto.

Crear una función de chunking sencilla y comprensible.

Cada chunk debe mantener metadata.

Ejemplo:

{
    "document_id": "...",
    "document_name": "manual_rrhh.pdf",
    "page": 32,
    "section": "Vacaciones",
    "chunk_index": 15
}

El tamaño del chunk debe ser configurable.

Utilizar overlap para evitar perder contexto entre fragmentos.

No implementar un algoritmo excesivamente complejo.

==================================================
8. CHROMADB
==================================================

Utilizar ChromaDB como base vectorial local.

Los datos deben almacenarse en:

./chroma_data/

Guardar:

- documentos/chunks
- embeddings
- metadata

El sistema debe poder:

- agregar chunks
- buscar por similitud
- obtener los documentos relevantes
- eliminar/reemplazar información de una versión anterior

No utilizar PostgreSQL ni pgvector.

==================================================
9. SQLITE
==================================================

SQLite se utilizará para metadata y datos de la aplicación.

Como mínimo debemos poder almacenar:

DOCUMENTOS:

- id
- nombre
- nombre_original
- tipo
- hash
- tamaño
- fecha
- estado

CONVERSACIONES:

- id
- fecha

MENSAJES:

- id
- conversation_id
- role
- content
- fecha

Si consideras que document_versions es necesario para la sincronización, puedes agregarlo.

No crear un modelo de datos excesivamente complejo.

==================================================
10. SINCRONIZACIÓN
==================================================

La carpeta:

./documents/

representa el repositorio compartido de documentos.

El sistema debe poder detectar:

- documentos nuevos
- documentos modificados
- documentos sin cambios

Utilizar SHA-256.

Ejemplo conceptual:

Archivo actual
    ↓
SHA-256
    ↓
Comparar con hash almacenado

Si no existe:

NUEVO

Si existe y el hash cambió:

MODIFICADO

Si existe y el hash es igual:

SIN CAMBIOS

El proceso debe volver a procesar solamente:

- documentos nuevos
- documentos modificados

Los documentos sin cambios deben ignorarse.

==================================================
11. API
==================================================

La API debe ser sencilla.

Endpoints esperados:

GET /health

GET /documents

POST /documents/upload

GET /documents/{id}

DELETE /documents/{id}

POST /documents/sync

POST /chat

GET /conversations

GET /conversations/{id}

Puedes modificar o agregar endpoints si existe una razón técnica clara.

Todos los endpoints deben utilizar Pydantic schemas cuando corresponda.

La API debe tener documentación automática de FastAPI.

==================================================
12. RAG
==================================================

El sistema debe utilizar Retrieval-Augmented Generation.

La lógica debe estar separada en:

rag.py

embeddings.py

llm.py

No mezclar toda la lógica en los routers.

Flujo:

Pregunta
    ↓
Embedding
    ↓
ChromaDB
    ↓
Top K resultados
    ↓
Contexto
    ↓
Prompt
    ↓
LLM
    ↓
Respuesta

El número de resultados recuperados debe ser configurable.

Por ejemplo:

TOP_K = 5

==================================================
13. REGLA FUNDAMENTAL DEL LLM
==================================================

El modelo debe responder basándose ÚNICAMENTE en el contexto recuperado.

Debe indicarle explícitamente:

- No inventar información.
- No utilizar conocimiento externo cuando no esté respaldado por los documentos.
- Si la información no está en los documentos, indicarlo claramente.
- Siempre proporcionar las fuentes utilizadas.

Ejemplo:

Pregunta:

"¿Cuántos días de vacaciones tiene un empleado?"

Contexto:

Manual RRHH, página 32.

Respuesta:

"Según el Manual de Recursos Humanos, los empleados tienen derecho a 15 días hábiles de vacaciones por año trabajado."

Fuentes:

1. Manual de Recursos Humanos 2026
   Página 32
   Sección: Vacaciones

==================================================
14. RESPUESTAS Y CITAS
==================================================

La API de chat debe devolver una estructura que permita al frontend mostrar:

- respuesta
- fuentes
- documento
- página
- sección
- fragmento

Ejemplo conceptual:

{
    "answer": "El empleado tiene derecho a 15 días...",
    "sources": [
        {
            "document": "manual_rrhh.pdf",
            "page": 32,
            "section": "Vacaciones",
            "content": "Fragmento utilizado..."
        }
    ]
}

Las fuentes son una funcionalidad fundamental.

==================================================
15. FRONTEND
==================================================

La interfaz debe ser moderna pero sencilla.

No dedicar demasiado tiempo a animaciones o elementos innecesarios.

Debe contener como mínimo:

PÁGINA PRINCIPAL

- barra lateral
- nombre del sistema
- acceso a consultas
- acceso a documentos
- acceso a sincronización

CHAT / CONSULTAS

- campo para pregunta
- botón enviar
- mensajes del usuario
- respuestas de la IA
- fuentes
- fragmentos utilizados

DOCUMENTOS

- lista de documentos
- nombre
- tipo
- estado
- fecha
- botón para cargar documento

SINCRONIZACIÓN

- botón "Sincronizar"
- documentos nuevos
- documentos modificados
- documentos sin cambios
- errores

==================================================
16. DISEÑO
==================================================

Utilizar:

React
TypeScript
Tailwind CSS

Diseño:

- limpio
- profesional
- minimalista
- tipo aplicación empresarial
- responsive

No utilizar una cantidad excesiva de componentes o librerías externas.

Priorizar componentes reutilizables.

==================================================
17. MANEJO DE ERRORES
==================================================

La aplicación debe manejar errores comunes:

- archivo inválido
- PDF corrupto
- DOCX inválido
- API de IA no disponible
- error de ChromaDB
- pregunta sin resultados
- documento duplicado
- documento modificado

Los errores deben ser claros para el usuario.

Nunca mostrar stack traces al usuario final.

Los detalles técnicos pueden registrarse en consola/logs.

==================================================
18. VARIABLES DE ENTORNO
==================================================

Las API keys NO deben escribirse directamente en el código.

Utilizar:

.env

Ejemplo:

LLM_API_KEY=
LLM_BASE_URL=
LLM_MODEL=
EMBEDDING_MODEL=

El archivo .env debe estar incluido en .gitignore.

Crear un .env.example si es necesario.

==================================================
19. CALIDAD DEL CÓDIGO
==================================================

El código debe ser:

- claro
- modular
- sencillo
- comentado solamente cuando sea necesario
- fácil de explicar académicamente

Evitar:

- funciones gigantes
- archivos gigantes
- variables con nombres poco claros
- lógica duplicada
- código innecesariamente abstracto
- patrones de diseño innecesarios

No implementar una arquitectura enterprise.

==================================================
20. METODOLOGÍA DE DESARROLLO
==================================================

IMPORTANTE:

NO desarrolles todo el proyecto de una sola vez.

Trabajaremos por fases.

FASE 1:
Configurar backend y entorno Python.

FASE 2:
Configurar SQLite y modelos.

FASE 3:
Implementar carga y procesamiento de documentos.

FASE 4:
Implementar chunking.

FASE 5:
Implementar embeddings + ChromaDB.

FASE 6:
Implementar búsqueda.

FASE 7:
Implementar integración con LLM.

FASE 8:
Implementar RAG completo.

FASE 9:
Implementar citas y fuentes.

FASE 10:
Implementar sincronización mediante hash.

FASE 11:
Crear frontend React + Tailwind.

FASE 12:
Integrar frontend y backend.

FASE 13:
Pruebas y correcciones.

FASE 14:
README y documentación académica.

==================================================
21. REGLA PARA EL AGENTE
==================================================

Antes de modificar código:

1. Analiza la estructura actual.
2. Lee los archivos relacionados.
3. Explica brevemente qué vas a cambiar.
4. Indica qué archivos serán modificados.
5. Implementa solamente la fase solicitada.
6. Ejecuta/prueba el código.
7. Corrige errores.
8. Explica qué quedó funcionando.

NO avances automáticamente a la siguiente fase.

Espera mi confirmación antes de continuar.

==================================================
22. REGLA IMPORTANTE SOBRE TECNOLOGÍAS
==================================================

Si consideras introducir una nueva librería o tecnología:

Primero explica:

- para qué sirve
- por qué es necesaria
- qué problema resuelve
- si podemos resolverlo sin ella

No agregues dependencias innecesarias.

==================================================
23. OBJETIVO FINAL
==================================================

El resultado final debe permitir:

1. Cargar un PDF o DOCX.
2. Extraer su contenido.
3. Dividirlo en chunks.
4. Generar embeddings.
5. Indexarlo en ChromaDB.
6. Hacer preguntas sobre los documentos.
7. Recuperar los fragmentos relevantes.
8. Generar una respuesta mediante un LLM.
9. Mostrar las fuentes exactas.
10. Detectar documentos nuevos o modificados.
11. Actualizar automáticamente el índice mediante sincronización.
12. Presentar todo mediante una interfaz React + Tailwind.

El proyecto debe ser suficientemente completo para ser presentado académicamente y suficientemente sencillo para poder comprender y explicar cada parte de su funcionamiento.

==================================================
24. PRIMERA TAREA DEL AGENTE
==================================================

NO empieces a programar inmediatamente.

Primero:

1. Analiza toda la estructura existente del proyecto.
2. Identifica qué archivos están vacíos.
3. Identifica qué archivos deberían contener cada responsabilidad.
4. Propón el orden exacto de implementación.
5. Detecta posibles problemas en la estructura actual.
6. Propón las dependencias iniciales.
7. Explica brevemente la arquitectura.

Después de realizar este análisis, ESPERA MI CONFIRMACIÓN.

No implementes todavía el proyecto completo.
