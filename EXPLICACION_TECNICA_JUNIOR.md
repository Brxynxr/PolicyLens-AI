# PolicyLens-AI — Guía Técnica Integral (Nivel Junior)

---

## 1. Resumen del Proyecto y Solución Funcional
* **El Problema:** Los empleados pierden horas buscando información específica dentro de manuales de recursos humanos, contratos legales y políticas internas densas.
* **La Solución:** Un centro de consultas interno donde cualquier colaborador puede hacer preguntas en lenguaje natural y obtener respuestas precisas acompañadas de las fuentes exactas y fragmentos originales.
* **La Automatización:** Un pipeline de ingesta y sincronización que detecta documentos nuevos o modificados, los procesa y mantiene actualizado el sistema de recuperación.

---

## 2. Tecnologías Utilizadas: Qué son, Para qué se usan y Por qué

| Tecnología | Qué es | Para qué se usa | Por qué se eligió |
| :--- | :--- | :--- | :--- |
| **Python 3.12 & FastAPI** | Lenguaje y framework backend | Construir la API REST y gestionar las rutas del sistema. | Velocidad, soporte asíncrono y validación automática de datos con Pydantic. |
| **SQLite & SQLAlchemy** | Base de datos relacional y ORM | Almacenar datos estructurados (usuarios, roles, hashes, auditoría y chats). | Ligera, sin servidor externo complejo, ideal para metadata y persistencia relacional. |
| **ChromaDB** | Base de datos vectorial | Almacenar y buscar vectores numéricos (*embeddings*). | Diseñada específicamente para búsquedas de similitud matemática ultra rápidas en alta dimensión. |
| **Ollama (`qwen3-embedding:0.6b`)** | Modelo de IA local de embeddings (1024 dimensiones) | Convertir texto en vectores numéricos capturando significado semántico. | Alta precisión multilingüe (MTEB), ventana de contexto de 32k tokens y privacidad total. |
| **PyMuPDF & python-docx** | Librerías de parsing | Extraer texto limpio de archivos PDF y Word (`.docx`). | Robustez y velocidad nativa para procesar documentos empresariales estándar. |
| **Ollama (`phi4-mini`)** | Modelo de Lenguaje Grande (LLM) local (3.8B) | Redactar y sintetizar respuestas en lenguaje natural con streaming SSE. | Modelo de alta eficiencia, bajo consumo de recursos, sin costo de API y 100% privado. |
| **React 19, Vite & Tailwind CSS** | Stack frontend | Proveer una interfaz web moderna, responsiva y veloz. | Estándar de la industria, componentes reactivos y diseño limpio. |

---

## 3. El Papel de cada Base de Datos

El sistema utiliza **dos bases de datos con propósitos totalmente distintos**:

1. **ChromaDB (Base de Datos Vectorial):**
   * **Qué guarda:** Los fragmentos de texto (*chunks*) de los documentos y sus respectivos **vectores numéricos** (embeddings de 1024 dimensiones).
   * **Para qué sirve:** Para realizar búsquedas por **similitud semántica** en milisegundos cuando el usuario hace una pregunta. No entiende de relaciones de usuarios, solo de cercanía matemática entre significados.

2. **SQLite (Base de Datos Relacional):**
   * **Qué guarda:** Datos estructurados: usuarios, contraseñas, roles (`admin` o `empleado`), metadatos de los documentos (incluyendo su hash SHA-256), registros de auditoría y el **historial de conversaciones de chat**.
   * **Para qué sirve:** Para gestionar la seguridad, la autenticación, los permisos y permitir que los usuarios consulten sus chats anteriores en la barra lateral.

---

## 4. Ciclo de Vida del Documento: ¿Qué pasa cuando llega y cómo se actualiza?

Cuando el administrador sube un documento o ejecuta la sincronización, ocurre un pipeline automatizado:

1. **Cálculo de Hash (SHA-256) para Control de Cambios:**
   * El sistema calcula una firma criptográfica única (*hash SHA-256*) basada en el contenido exacto del archivo.
   * **¿Cómo sabe si está actualizado?** Compara este hash con el guardado en **SQLite**. Si el hash no ha cambiado, el documento se omite (ahorrando tiempo). Si es nuevo o su contenido fue modificado, el sistema procede a actualizarlo automáticamente.
2. **Extracción de Texto (*Parsers*):** Se lee el archivo según su formato (PDF, Word, HTML) para extraer texto limpio.
3. **Fragmentación (*Chunking*):** El texto se corta en bloques manejables (*chunks*) de 1800 caracteres con 350 de solapamiento para lograr mayor precisión en la búsqueda.
4. **Vectorización y Almacenamiento:** Cada chunk se pasa por el modelo local `qwen3-embedding:0.6b` para convertirse en vector. Se guarda en **ChromaDB** (listo para buscar) y su metadata/hash en **SQLite**.

---

## 5. Funcionamiento de los Dos Modos de Consulta

### A. Modo LLM (RAG + Ollama Local) — *Modo Inteligente y Conversacional*
* **Función:** Redactar una respuesta natural y explicativa basada en los documentos de la empresa.
* **Flujo:**
  1. El usuario escribe la pregunta.
  2. El modelo local (`qwen3-embedding:0.6b`) vectoriza la pregunta.
  3. **ChromaDB + BM25** buscan y recuperan los fragmentos de documentos más cercanos semántica y léxicamente.
  4. El backend empaqueta la pregunta y los fragmentos en un **Prompt estructurado**.
  5. Se envía al **LLM local (`phi4-mini`)** vía Ollama.
  6. El LLM lee el contexto y redacta una respuesta fluida con streaming SSE token a token, devolviéndola junto con las tarjetas de fuentes (*SourceCards*).

### B. Modo Solo Documento (Búsqueda Rápida) — *Modo Búsqueda Semántica*
* **Función:** Encontrar y mostrar los fragmentos de texto exactos de los documentos de forma instantánea sin intervención de un LLM.
* **Flujo:**
  1. El usuario escribe la pregunta.
  2. El modelo local vectoriza la pregunta.
  3. **ChromaDB** busca los fragmentos más cercanos.
  4. **Se detiene el proceso:** No se llama al LLM. El backend devuelve directamente los fragmentos crudos al chat en milisegundos (~20-30 ms), ideal para verificar que la búsqueda semántica está encontrando la fuente correcta.

