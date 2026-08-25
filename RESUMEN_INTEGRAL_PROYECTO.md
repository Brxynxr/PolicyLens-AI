# PolicyLens-AI — Resumen Técnico Integral del Proyecto

---

## 1. Visión General del Proyecto
* **El Problema:** Los empleados pierden horas buscando información específica dentro de manuales de recursos humanos, contratos legales y políticas internas extensas.
* **La Solución:** Un centro de consultas interno donde cualquier colaborador puede hacer preguntas en lenguaje natural y obtener respuestas precisas respaldadas por las fuentes exactas.

---

## 2. Stack Tecnológico: ¿Qué se usó, para qué y por qué?

| Tecnología | Qué es | Para qué se usa | Por qué se eligió |
| :--- | :--- | :--- | :--- |
| **Python 3.12 & FastAPI** | Lenguaje y framework backend | Construir la API REST y gestionar los endpoints. | Alta velocidad, soporte asíncrono y validación automática de datos. |
| **SQLite & SQLAlchemy** | Base de datos relacional y ORM | Almacenar datos estructurados (usuarios, roles, hashes de archivos y chats). | Ligera, sin servidores externos complejos, ideal para persistencia relacional y metadatos. |
| **ChromaDB** | Base de datos vectorial | Almacenar y buscar vectores numéricos (*embeddings*). | Optimizada específicamente para búsquedas de similitud matemática en alta dimensión. |
| **Sentence-Transformers (`bge-m3`)** | Modelo de IA local (1024 dimensiones) | Convertir texto en vectores numéricos capturando significado semántico. | Excelente precisión multilingüe (SOTA) y gran ventana de contexto (8192 tokens) sin truncar texto. |
| **PyMuPDF & python-docx** | Librerías de parsing | Extraer texto limpio de archivos PDF y Word (`.docx`). | Velocidad y robustez para procesar documentos corporativos estándar. |
| **NVIDIA NIM (`Llama-3.1-8b-instruct`)** | Modelo de Lenguaje Grande (LLM) en la nube | Actuar como redactor y sintetizador de respuestas naturales. | Gran capacidad de razonamiento y síntesis sin sobrecargar el hardware local. |
| **React 19, Vite & Tailwind CSS** | Stack frontend | Proveer una interfaz web moderna, responsiva y veloz. | Estándar de la industria, componentes reactivos y diseño limpio. |

---

## 3. ¿Cómo se usan las Bases de Datos? (Diferencia de Roles)

El sistema utiliza **dos bases de datos con propósitos totalmente complementarios**:

### A. ChromaDB (Base de Datos Vectorial)
* **Qué almacena:** Los fragmentos de texto (*chunks*) de los documentos y sus respectivos **vectores numéricos** (embeddings de 1024 dimensiones).
* **Función:** Realizar búsquedas por **similitud semántica** en milisegundos cuando el usuario hace una pregunta. No entiende de usuarios ni contraseñas, solo calcula distancias geométricas entre significados matemáticos.

### B. SQLite (Base de Datos Relacional)
* **Qué almacena:** Datos estructurados: usuarios, contraseñas hasheadas, roles (`admin` o `empleado`), metadatos de los documentos (incluyendo su hash SHA-256) y el **historial de conversaciones de chat**.
* **Función:** Gestionar la seguridad, la autenticación, los permisos de acceso y permitir que los usuarios consulten sus chats anteriores en la barra lateral.

---

## 4. Ciclo de Vida del Documento: Ingesta, Control de Cambios y Actualización

Cuando se sube un documento nuevo o se ejecuta la sincronización, el sistema sigue este pipeline automatizado:

1. **Cálculo de Hash (SHA-256) para Detección de Cambios:**
   * El sistema calcula una firma criptográfica única (*hash SHA-256*) basada en el contenido exacto del archivo.
   * **¿Cómo sabe si está actualizado?** Compara este hash con el registro guardado en **SQLite**. Si el archivo no ha cambiado, se omite para ahorrar recursos. Si es nuevo o su contenido fue modificado, el sistema procede a actualizarlo automáticamente.
2. **Extracción de Texto (*Parsers*):** Se lee el archivo según su formato (PDF, Word, HTML) para extraer texto plano estructurado.
3. **Fragmentación (*Chunking*):** El texto se corta en bloques manejables (*chunks*) para evitar saturar los modelos y lograr mayor precisión en la búsqueda vectorial.
4. **Vectorización y Almacenamiento:** Cada chunk se pasa por el modelo local `bge-m3` para convertirse en vector. Se guarda en **ChromaDB** (listo para buscar) y su metadata/hash en **SQLite**.

---

## 5. Funcionamiento de los Dos Modos de Consulta

### A. Modo LLM (RAG + Cloud LLM) — *Modo Inteligente y Conversacional*
* **Función:** Redactar una respuesta natural y explicativa basada en los documentos de la empresa.
* **Flujo paso a paso:**
  1. El usuario escribe su pregunta en el chat (ej. *"¿Cuántos días de vacaciones tengo?"*).
  2. El modelo local (`bge-m3`) convierte la pregunta en un vector numérico.
  3. **ChromaDB** compara el vector de la pregunta con los vectores guardados y recupera los fragmentos de documentos más relevantes.
  4. El backend empaqueta la pregunta y los fragmentos en un **Prompt estructurado** (texto plano con instrucciones y contexto).
  5. Se envía vía API HTTP al **LLM de NVIDIA (Llama 3.1)** en la nube.
  6. El LLM lee el contexto y redacta una respuesta fluida, devolviéndola al usuario junto con las tarjetas de fuentes (*SourceCards*).

### B. Modo Solo Embeddings (Búsqueda Rápida) — *Modo Auditoría Local*
* **Función:** Encontrar y mostrar los fragmentos de texto exactos de los documentos de forma instantánea sin intervención de un LLM.
* **Flujo paso a paso:**
  1. El usuario escribe su pregunta.
  2. El modelo local (`bge-m3`) convierte la pregunta en un vector.
  3. **ChromaDB** busca los fragmentos más similares.
  4. **Se detiene el proceso aquí:** No se llama a ninguna API externa ni LLM. El backend devuelve directamente los fragmentos crudos al chat en milisegundos (~20-30 ms), sirviendo para verificar que la búsqueda semántica encuentra la fuente correcta de inmediato.
