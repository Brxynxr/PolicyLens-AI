
---

# Benchmark: Modo RAG+LLM vs Modo Search (Solo Embeddings)

**Fecha de ejecución:** 2026-08-21 07:48:54  
**Configuración:** mismas 10 preguntas del benchmark anterior, mismo índice vectorial (17 chunks post-refactor), misma función de evaluación factual.  
**RAG:** embeddings + ChromaDB + NVIDIA NIM · **Search:** embeddings + extracción directa de pasajes (sin LLM)

## Resultado general

| Métrica | RAG + LLM | Search (embeddings) |
|---------|-----------|---------------------|
| Casos correctos | **10/10** | 9/10 |
| Precisión factual media | **100%** | 89% |
| Latencia por consulta | ~1.1 s (mediana) | **0.04 s (~27x más rápido)** |
| Interpretación / redacción | Respuesta natural generada por LLM | Cita textual de pasajes |
| Costo por consulta | Tokens API (NVIDIA) | Cero (100% local) |

## Comparación caso a caso

| # | Pregunta | RAG: tiempo / resultado | Search: tiempo / resultado | Hecho esperado |
|---|----------|--------------------------|-----------------------------|----------------|
| 1 | ¿Cuántos días de vacaciones tengo por año? | 10.92s ✅ | 0.04s ✅ | `15` |
| 2 | ¿Cuántos días de vacaciones corresponden con más de 5 años d | 0.87s ✅ | 0.04s ✅ | `20` |
| 3 | ¿Con cuánta anticipación debo solicitar mis vacaciones? | 1.08s ✅ | 0.04s ✅ | `15` |
| 4 | ¿Hasta cuántos días a la semana puedo trabajar en remoto (te | 1.57s ✅ | 0.04s ✅ | `2` |
| 5 | ¿De cuánto es el subsidio mensual de teletrabajo? | 0.7s ✅ | 0.04s ✅ | `150` |
| 6 | ¿Cuántos días hábiles de permiso remunerado tengo por matrim | 1.05s ✅ | 0.04s ✅ | `5` |
| 7 | ¿En cuántos días debo cargar una incapacidad médica en HR Po | 1.1s ✅ | 0.04s ✅ | `2` |
| 8 | ¿Qué día se paga el salario? | 1.17s ✅ | 0.04s ✅ | `último día hábil, ultimo dia habil` |
| 9 | ¿De cuánto es el aumento salarial por desempeño excepcional? | 1.06s ✅ | 0.04s ❌ | `7%` |
| 10 | ¿Cuál es la capital de Francia? | 0.04s ✅ | 0.04s ✅ | `no debe alucinar` |

---

## Análisis

### Dónde gana Search (embeddings)

- **Latencia inigualable**: todas las respuestas en 0.04 s constantes (RAG mediana ~1.1 s, con picos de hasta 30 s por latencia de la API externa).
- El caso #3 (*anticipación de vacaciones*), que históricamente fue el más problemático, funciona perfecto en ambos modos tras el refactor de chunking.
- Ideal como verificación rápida de que la búsqueda semántica y los umbrales funcionan correctamente.

### Limitación observada en Search (caso #9)

- *"¿De cuánto es el aumento salarial por desempeño excepcional?"*: la recuperación fue correcta (`politica_salario_beneficios.docx`, sección de revisión salarial), pero el extractor de pasaje clave citó el párrafo adyacente (**desempeño esperado → 3%**) en lugar del buscado (**excepcional → 7%**).
- En RAG el LLM lee el contexto completo y sí responde 7%. Es la limitación estructural del modo sin LLM: cita texto literal sin discriminar entre párrafos semánticamente vecinos.

### Robustez ante preguntas fuera de dominio (caso #10)

- Ambos modos rechazan correctamente la pregunta sobre la capital de Francia sin alucinar: Search porque ningún fragmento supera los umbrales, RAG además por el system prompt del LLM.

---

## Conclusión

| Criterio | Ganador |
|----------|---------|
| Precisión de respuesta | 🏆 RAG + LLM (10/10 vs 9/10) |
| Velocidad | 🏆 Search (0.04 s vs ~1.1 s, ~27x) |
| Costo / privacidad | 🏆 Search (0 tokens, 0 datos salen del servidor) |
| Experiencia de usuario | 🏆 RAG (respuestas directas vs citas textuales) |

> **Recomendación:** mantener RAG como modo principal para usuarios finales y Search como herramienta de diagnóstico/verificación del índice (rol admin o panel técnico). El pipeline de recuperación compartido está sano: los 2 modos coinciden en 9/10 casos.
---

# Anexo: Stack de Embeddings utilizado en el modo Search

**Fecha:** 2026-08-21 · Documentación técnica del componente de embeddings evaluado en el benchmark anterior.

## Modelo en uso

| Característica | Valor |
|----------------|-------|
| Modelo | `paraphrase-multilingual-MiniLM-L12-v2` (sentence-transformers) |
| Definición | Hardcodeado en `backend/services/embeddings.py:22` (`_get_local_model`) |
| Dimensión | 384 vectores |
| Ejecución | 100% local (CPU/GPU), sin envío de datos externos |
| Descarga inicial | ~120 MB desde HuggingFace (primer arranque del servidor) |
| Multilingüe | Sí — optimizado para similitud semántica en español |

## Flujo completo del modo Search (sin LLM)

```
Pregunta
  → embedding local (MiniLM, 384d)
  → query ChromaDB "documents" (distancia coseno, top_k=12)
  → re-ranking híbrido: (cos*0.85) + (BM25*0.15) + metadata_boost(+15)
  → filtros: cos >= 26.0 / hibrido >= 28.0 / fallback Top-1 con cos >= 22.0
  → extracción de pasaje clave (_extraer_pasaje_clave)
  → respuesta con cita textual + documento/página
```

El mismo pipeline de recuperación alimenta al modo RAG; la única diferencia es el paso final (LLM generativo vs cita textual directa).

## Observación técnica: variable de entorno sin uso

La variable `EMBEDDING_MODEL=nvidia/nv-embedqa-e5-v5` del `.env` **no tiene efecto** sobre el modo Search ni sobre el RAG:

- Solo aplicaría a los métodos `_generar_embedding_api()` / `_generar_embeddings_lote_api()` de `embeddings.py`, que requieren llamar con `local=False`.
- Todo el pipeline (`rag.py:138,170`) invoca siempre `local=True`.
- Es un residuo de la integración API de NVIDIA para embeddings: el código existe pero ningún flujo lo utiliza.

**Implicación práctica:** cambiar `EMBEDDING_MODEL` en `.env` no altera el comportamiento del sistema. El modelo real de embeddings solo puede cambiarse editando el literal en `embeddings.py:22`.

## Advertencia operativa

Si algún día se cambia el modelo de embeddings (dimensiones o espacio semántico distintos), NO basta con reiniciar: hay que regenerar todo el índice con:

```bash
python -m backend.scripts.reindexar_todo
```

Mezclar vectores de dos modelos en una misma colección corrompe los resultados por incompatibilidad dimensional/semántica.

---

# Migración de Embeddings: MiniLM (384d) → BAAI/bge-m3 (1024d)

**Fecha:** 2026-08-21 · **Motivo:** eliminar el código fantasma (`EMBEDDING_MODEL` ignorado) e integrar un modelo con ventana de 8192 tokens que elimina el truncamiento a 128 tokens detectado como contra principal.

## Cambios aplicados

| # | Cambio | Archivo |
|---|--------|---------|
| 1 | Nueva variable `EMBEDDING_MODEL_LOCAL=BAAI/bge-m3` | `.env`, `.env.example`, `README.md` |
| 2 | `_get_local_model()` lee `EMBEDDING_MODEL_LOCAL` con fallback `BAAI/bge-m3`; lazy loading en primera consulta | `backend/services/embeddings.py` |
| 3 | Eliminados los métodos API muertos (`_generar_embedding_api`, `_generar_embeddings_lote_api`) y el flag `local` de todo el pipeline | `embeddings.py`, `rag.py` |
| 4 | Índice regenerado: 17 chunks, vectores verificados de **1024 dimensiones** | ChromaDB |

## Validación post-migración (mismas 10 preguntas)

| Modo | Correctos | Precisión factual | Latencia por consulta |
|------|-----------|-------------------|------------------------|
| Search (bge-m3) | 9/10 | 89% | ~0.12 s (antes 0.04 s — 3x más lento por modelo grande en CPU, irrelevante en la práctica) |
| RAG + LLM (bge-m3 + NVIDIA NIM) | **10/10** | **100%** | ~1.2 s mediana (sin regresión) |

El caso #9 sigue fallando solo en modo Search por el extractor de pasajes (`_extraer_pasaje_clave`), no por embeddings: bge-m3 recupera el documento y sección correctos.

## Ventajas obtenidas

- **Sin truncamiento**: ventana de 8192 tokens cubre chunks completos de 1800 chars (MiniLM solo vectorizaba los primeros ~128 tokens).
- **Mejor calidad multilingüe**: modelo SOTA de recuperación (MTEB/C-MTEB).
- **Configuración coherente**: una variable → un consumidor. Cero código fantasma.

## Costo de la migración

- Descarga inicial: **~2.3 GB** (vs 120 MB de MiniLM).
- RAM del servidor: el modelo large ocupa más memoria al cargarse.
- Primera consulta tras arrancar: ~9 s (carga del modelo); siguientes ~0.12 s.

---

# Calibración de Umbrales (bge-m3) + Fix del Metadata Boost

**Fecha:** 2026-08-21 · Basado en `DIAGNOSTICO_BGE_M3.md`.

## Cambios en `backend/services/rag.py`

| Parámetro | Antes | Después | Justificación |
|-----------|-------|---------|---------------|
| `UMBRAL_COS_RELEVANTE` | 26.0 | **42.0** | Ruido out-of-domain (≤30.9) bloqueado por la compuerta coseno; relevantes (≥44.6) pasan con holgura |
| `UMBRAL_HIBRIDO_RELEVANTE` | 28.0 | **45.0** | Segunda compuerta alineada con la nueva separación de distribuciones |
| `UMBRAL_COS_FALLBACK` | 22.0 | **38.0** | El Top-1 de respaldo ya no entrega ruido fuera de dominio |

**Fix del Metadata Boost:** `_boost_metadata` normaliza ahora el nombre del archivo (`re.sub(r"[\._\-]", " ", ...)`) antes de tokenizar. Verificado: "politica_salario_beneficios.docx" → tokens ['politica','salario','beneficios','docx'] y P2 muestra boost=+15 en ambos chunks del documento correcto (hybrid 62.7→77.7).

## Validación post-calibración

| Caso | Resultado |
|------|-----------|
| Benchmark completo modo RAG | **10/10, 100% precisión** — sin regresión |
| P4 fuera de dominio | Rechazada por doble compuerta a nivel retrieval (cos 30.9 < 42), sin depender del LLM |
| Tests unitarios | 13/13 OK |

## ⚠️ Incidencia operativa detectada durante la validación

Ejecutar los tests unitarios **destruye el índice productivo de ChromaDB**: los mocks de embeddings usan vectores de 384d sobre el `chroma_data/` real, lo que dispara `_reset_coleccion()` por conflicto de dimensiones y deja la colección vacía (0 chunks). Se recuperó regenerando el índice con `reindexar_todo()`. **Pendiente recomendado:** aislar la ruta de ChromaDB para tests (ej. variable `CHROMA_PATH` en `.env` apuntando a un directorio temporal durante pruebas).

---

# Refactor de Extracción de Pasajes (`_extraer_pasaje_clave`)

**Fecha:** 2026-08-21 · Corrige el fallo del Caso #9 en modo Search.

## Nueva lógica en `backend/services/rag.py`

1. **Sentence-Level Scoring:** el chunk se divide con `re.split(r'(?<=[.!?])\s+', texto)` y cada oración se puntúa por solapamiento de tokens con la pregunta (stopwords excluidas).
2. **Multiplicador x2.0:** si la oración contiene un calificador/superlativo presente en la pregunta (constante `CALIFICADORES_BOOST`: excepcional, máximo, mínimo, destacado, superior, óptimo, prioritario, crítico).
3. **Selección:** mejor oración + vecina adyacente de mayor aporte (empate → la siguiente, por continuidad de lectura). Si nadie puntúa, se conserva el snippet histórico por bloques (`_pasaje_por_bloques`) como fallback sin regresiones.
4. Guardas intactas: chunk <600 chars se devuelve completo; pasaje <100 chars devuelve el chunk entero.

## Validación

| Prueba | Resultado |
|--------|-----------|
| Test unitario offline (chunk sintético del caso #9) | Extrae "Desempeño **excepcional** ... hasta el **7%**" como oración principal, con la del 3% solo como contexto ✅ |
| Pregunta inversa ("desempeño esperado") | Lidera con la del 3% ✅ |
| Sin coincidencias (control Francia) | Fallback por bloques, sin crash ni vacío ✅ |
| Benchmark completo modo Search | **10/10 — 100% precisión** (antes 9/10: fallaba el caso #9) |
| Tests unitarios | 13/13 OK + reindex posterior (incidencia conocida de tests vs ChromaDB) |

El modo Search queda alineado con RAG+LLM: ambos 10/10.

---

# Aislamiento de ChromaDB para Tests (`CHROMA_PATH`)

**Fecha:** 2026-08-21 · Cierra la incidencia operativa detectada en la calibración.

## Causa raíz
`test_chat_conversation_continuity` llama a `/chat` real → consulta a ChromaDB con embedding mock de **384d** contra la colección productiva de **1024d** → error de dimensión → `_reset_coleccion()` borraba el índice completo (0 chunks). Los singletons (`routers/*.py:17,23`) se crean al importar `backend.main`, por lo que el parche debía aplicarse antes de esa importación.

## Solución
1. `backend/services/rag.py`: ruta configurable vía env var — `chroma_path = os.getenv("CHROMA_PATH") or <ruta por defecto>`.
2. Ambos archivos de tests fijan `os.environ["CHROMA_PATH"] = tempfile.mkdtemp(prefix="chroma_test_")` **antes** de importar `backend.main`.
3. `.env.example`: variable documentada como override opcional (comentada; el default no cambia).

## Validación
| Check | Resultado |
|-------|-----------|
| Chunks productivos antes de tests | 17 |
| Unittests (13) | OK |
| Chunks productivos después de tests | **17 — intacto** (antes quedaba en 0) |
| Dirs temporales creados por tests | `/tmp/chroma_test_*` (uno por archivo de tests) |
| Sanity query post-tests | cos=68.8 en `manual_rrhh_2026.pdf` — idéntico a la matriz del diagnóstico |

Ya no es necesario regenerar el índice después de correr los tests.
