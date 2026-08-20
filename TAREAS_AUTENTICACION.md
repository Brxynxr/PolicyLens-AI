# TAREAS — Sistema de Roles y Usuarios

## Objetivo

Agregar gestión de usuarios a PolicyLens-AI:
- **Admin**: CRUD de documentos, usuarios y sincronización
- **Empleado**: Solo consultas en el chat RAG

---

## Enfoque Simplificado

Para este proyecto académico se omiten:
- ❌ JWT y tokens
- ❌ Hashing de contraseñas (password en texto plano)
- ❌ Middleware de autenticación complejo

Se implementa:
- ✅ CRUD de usuarios
- ✅ Login simple (verificación en BD)
- ✅ Admin por defecto
- ✅ Protección de endpoints por rol

---

## Modelo de Datos

### Tabla: users

```
User:
  id: int              (PK, autoincrement)
  nombre: str          (not null)
  email: str           (unique, not null)
  password: str        (texto plano, not null)
  role: str            ("admin" | "empleado")
  is_active: bool      (default True)
  created_at: datetime (default now)
```

### Usuario admin por defecto

```
nombre: Admin
email: admin@policylens.com
password: admin123
role: admin
```

---

## Endpoints

### Auth

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/login` | Login simple, retorna usuario |
| GET | `/auth/me` | Obtener usuario por ID |

### Usuarios

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/users` | Listar usuarios |
| POST | `/users` | Crear usuario |
| PUT | `/users/{id}` | Editar usuario |
| DELETE | `/users/{id}` | Eliminar usuario |

---

## Flujo de Login

```
1. Login
   POST /auth/login {email, password}
   → Buscar usuario por email en BD
   → Comparar password (texto plano)
   → Retornar {user, message}

2. Frontend
   → Guardar user_id en localStorage
   → Usar user_id para /auth/me
```

---

# INTEGRANTE 1: Backend & Core Engineer

**Responsable:** Modelo de datos, endpoints de auth y usuarios.

**Estado:** ✅ COMPLETADO

---

### Tarea 1: Modelo de Usuario

**Archivo:** `backend/models/user.py` (creado)

Modelo User con SQLAlchemy:
- id, nombre, email, password (texto plano), role, is_active, created_at

**Estado:** ✅ Completado

---

### Tarea 2: Schemas de Usuario

**Archivo:** `backend/schemas/user.py` (creado)

| Schema | Campos |
|--------|--------|
| `UserCreate` | nombre, email, password, role |
| `UserUpdate` | nombre (opt), email (opt), role (opt), is_active (opt) |
| `UserResponse` | id, nombre, email, role, is_active, created_at |
| `UserListResponse` | total, users |
| `LoginRequest` | email, password |
| `LoginResponse` | user, message |

**Estado:** ✅ Completado

---

### Tarea 3: Servicio de Auth

**Archivo:** `backend/services/auth.py` (creado)

| Método | Parámetros | Retorna |
|--------|-----------|---------|
| `authenticate_user(db, email, password)` | email + password | User o None |

**Estado:** ✅ Completado

---

### Tarea 4: Router de Auth

**Archivo:** `backend/routers/auth.py` (creado)

| Endpoint | Método | Lógica |
|----------|--------|--------|
| `/auth/login` | POST | Buscar usuario, comparar password, retornar usuario |
| `/auth/me` | GET | Buscar usuario por ID |

**Estado:** ✅ Completado

---

### Tarea 5: Router de Usuarios

**Archivo:** `backend/routers/users.py` (creado)

| Endpoint | Método | Lógica |
|----------|--------|--------|
| `/users` | GET | Listar todos los usuarios |
| `/users` | POST | Crear usuario |
| `/users/{id}` | PUT | Editar usuario (campos opcionales) |
| `/users/{id}` | DELETE | Eliminar usuario |

**Estado:** ✅ Completado

---

### Tarea 6: Integrar en main.py

**Archivo:** `backend/main.py` (modificado)

- Importar y registrar routers (auth, users)
- Crear admin por defecto en lifespan

**Estado:** ✅ Completado

---

### Archivos del Integrante 1

| Tipo | Archivo | Estado |
|------|---------|--------|
| Crear | `backend/models/user.py` | ✅ |
| Crear | `backend/schemas/user.py` | ✅ |
| Crear | `backend/services/auth.py` | ✅ |
| Crear | `backend/routers/auth.py` | ✅ |
| Crear | `backend/routers/users.py` | ✅ |
| Modificar | `backend/models/__init__.py` | ✅ |
| Modificar | `backend/main.py` | ✅ |

---

# INTEGRANTE 2: Frontend & Integration Lead

**Responsable:** Login, rutas protegidas, sidebar dinámico, página de usuarios.

**Estado:** PENDIENTE

---

### Tarea 1: Servicio de Auth

**Archivo:** `frontend/src/services/auth.ts` (nuevo)

Crear funciones:

| Función | Llamada | Almacenamiento |
|---------|---------|----------------|
| `login(email, password)` | POST `/auth/login` | Guardar user_id en `localStorage` |
| `logout()` | — | Eliminar user_id de `localStorage` |
| `getUsuarioActual()` | GET `/auth/me?user_id=...` | — |
| `getUser_id()` | — | Leer user_id de `localStorage` |

---

### Tarea 2: Contexto de Autenticación

**Archivo:** `frontend/src/context/AuthContext.tsx` (nuevo)

Crear contexto que provea:

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `user` | `User \| null` | Usuario autenticado |
| `isAuthenticated` | `bool` | Hay user_id en localStorage |
| `isAdmin` | `bool` | role === "admin" |
| `login(email, password)` | `Promise<void>` | Login y guardar user_id |
| `logout()` | `void` | Logout y limpiar |

Al montar:
- Si hay user_id en localStorage → llamar GET `/auth/me` para validar
- Si user_id inválido → limpiar y redirigir a `/login`

---

### Tarea 3: Página de Login

**Archivo:** `frontend/src/pages/LoginPage.tsx` (nuevo)

Crear formulario con:
- Campo email (type email)
- Campo password (type password)
- Botón "Iniciar Sesión"
- Mensaje de error si falla
- Al exito → redirigir a `/chat`

Diseño: centrado, fondo neutro, card blanca con sombra.

---

### Tarea 4: Rutas Protegidas

**Archivo:** `frontend/src/App.tsx` (modificar)

Crear componente `ProtectedRoute`:
```typescript
function ProtectedRoute({ children, adminOnly = false }) {
  // Si no hay user_id → redirigir a /login
  // Si adminOnly y no es admin → redirigir a /chat
  // Si todo OK → renderizar children
}
```

Nueva estructura de rutas:
```
/login              → LoginPage (público)
/chat               → ProtectedRoute → ChatPage (cualquier rol)
/documents          → ProtectedRoute adminOnly → DocumentsPage
/sync               → ProtectedRoute adminOnly → SyncPage
/users              → ProtectedRoute adminOnly → UsersPage
```

---

### Tarea 5: Sidebar Dinámico

**Archivo:** `frontend/src/components/Sidebar.tsx` (modificar)

| Rol | Items visibles |
|-----|----------------|
| Admin | Consultas, Documentos, Sincronización, Usuarios |
| Empleado | Solo Consultas |

Agregar abajo:
- Nombre del usuario
- Botón "Cerrar Sesión"

---

### Tarea 6: Servicio de Usuarios

**Archivo:** `frontend/src/services/users.ts` (nuevo)

| Función | Método | Endpoint |
|---------|--------|----------|
| `listarUsuarios()` | GET | `/users` |
| `crearUsuario(data)` | POST | `/users` |
| `editarUsuario(id, data)` | PUT | `/users/{id}` |
| `eliminarUsuario(id)` | DELETE | `/users/{id}` |

---

### Tarea 7: Página de Usuarios

**Archivo:** `frontend/src/pages/UsersPage.tsx` (nuevo)

Crear interfaz:
- Tabla con columnas: Nombre, Email, Rol, Estado, Fecha, Acciones
- Botón "Crear Usuario" → abre modal
- Botón editar → abre modal con datos
- Botón eliminar → confirmación
- Solo visible para admin

---

### Tarea 8: Modal de Usuarios

**Archivo:** `frontend/src/components/UserModal.tsx` (nuevo)

Crear modal con formulario:
- Campo nombre
- Campo email
- Campo password (solo al crear, no al editar)
- Select de rol (admin / empleado)
- Botón Guardar / Cancelar

---

### Tarea 9: Layout Actualizado

**Archivo:** `frontend/src/components/Layout.tsx` (modificar)

- Si no está autenticado → renderizar solo `<Outlet />` sin sidebar
- Si está autenticado → renderizar sidebar + outlet
- En móvil: sidebar colapsable

---

### Archivos del Integrante 2

| Tipo | Archivo | Estado |
|------|---------|--------|
| Crear | `frontend/src/services/auth.ts` | PENDIENTE |
| Crear | `frontend/src/services/users.ts` | PENDIENTE |
| Crear | `frontend/src/context/AuthContext.tsx` | PENDIENTE |
| Crear | `frontend/src/pages/LoginPage.tsx` | PENDIENTE |
| Crear | `frontend/src/pages/UsersPage.tsx` | PENDIENTE |
| Crear | `frontend/src/components/UserModal.tsx` | PENDIENTE |
| Modificar | `frontend/src/App.tsx` | PENDIENTE |
| Modificar | `frontend/src/components/Sidebar.tsx` | PENDIENTE |
| Modificar | `frontend/src/components/Layout.tsx` | PENDIENTE |

---

# INTEGRANTE 3: AI & Data Pipeline Architect

**Responsable:** Integración auth + RAG, protección de endpoints, verificación.

**Estado:** PENDIENTE

---

### Tarea 1: Proteger Endpoints por Rol

**Archivos a modificar:**
- `backend/routers/documents.py`
- `backend/routers/sync.py`
- `backend/routers/chat.py`

**Objetivo:** Controlar quién puede acceder a cada endpoint según su rol.

| Endpoint | Rol requerido | Lógica |
|----------|---------------|--------|
| GET /documents | Admin | Solo admin ve documentos |
| POST /documents/upload | Admin | Solo admin sube documentos |
| GET /documents/{id} | Admin | Solo admin ve detalle |
| DELETE /documents/{id} | Admin | Solo admin borra |
| POST /documents/sync | Admin | Solo admin sincroniza |
| POST /chat | Cualquier rol | Todos pueden preguntar |
| GET /chat/conversations | Cualquier rol | Todos ven sus conversaciones |
| GET /chat/conversations/{id} | Cualquier rol | Todos ven detalle |
| DELETE /chat/conversations/{id} | Cualquier rol | Todos pueden borrar |

**Implementación:**

1. Agregar parámetro `user_id` a endpoints protegidos
2. Buscar usuario en BD y verificar rol
3. Si no tiene permiso → retornar 403

---

### Tarea 2: Verificar Pipeline RAG + Auth

Verificar que:
- `POST /chat` funciona correctamente
- `RAGService.preguntar()` no se ve afectado por el cambio
- Las conversaciones se guardan correctamente

---

### Tarea 3: Verificar Protección de Endpoints

Probar con curl:

```bash
# Admin puede acceder a documentos
TOKEN_ADMIN="..."
curl -X GET http://localhost:8000/documents -H "user_id: 1"

# Empleado NO puede acceder a documentos
curl -X GET http://localhost:8000/documents -H "user_id: 2"
# → debe retornar 403

# Cualquiera puede usar chat
curl -X POST http://localhost:8000/chat -H "Content-Type: application/json" -d '{"question":"test"}'
```

---

### Tarea 4: Verificar Frontend

Verificar que:
- El login funciona correctamente
- El user_id se guarda en localStorage
- El admin ve todas las páginas
- El empleado solo ve chat
- El sidebar es dinámico según el rol

---

### Tarea 5: Documentación

**Archivos a modificar:**

`README.md`:
- Sección de autenticación
- Credenciales del admin por defecto
- Endpoints y sus roles
- Flujo de login

`CONTEXTO_GENERAL.md`:
- Nuevo modelo User
- Nuevos endpoints de auth y users
- Sistema de roles

---

### Tarea 6: Verificar Variables de Entorno

Verificar que:
- `.env` tiene las variables correctas
- `.gitignore` incluye `.env`

---

### Archivos del Integrante 3

| Tipo | Archivo | Estado |
|------|---------|--------|
| Modificar | `backend/routers/documents.py` | PENDIENTE |
| Modificar | `backend/routers/sync.py` | PENDIENTE |
| Modificar | `backend/routers/chat.py` | PENDIENTE |
| Modificar | `README.md` | PENDIENTE |
| Modificar | `CONTEXTO_GENERAL.md` | PENDIENTE |
| Verificar | `.env` | PENDIENTE |
| Verificar | `.gitignore` | PENDIENTE |

---

# ORDEN DE IMPLEMENTACIÓN

```
Fase 1 (Backend - Integrante 1): ✅ COMPLETADA
  Tareas 1-6
  → Auth y CRUD usuarios funcionando

Fase 2 (Frontend - Integrante 2): PENDIENTE
  Tareas 1-9
  → Login, rutas protegidas, sidebar, página usuarios

Fase 3 (Integración - Integrante 3): PENDIENTE
  Tareas 1-6
  → Proteger endpoints, verificar RAG, documentación
```

---

# VERIFICACIÓN FINAL

- [x] Modelo User creado
- [x] Schemas Pydantic creados
- [x] Servicio de auth creado
- [x] Router de auth creado
- [x] Router de usuarios CRUD creado
- [x] Admin por defecto se crea automáticamente
- [x] Login funcional (texto plano)
- [ ] Backend: Endpoints protegidos por rol
- [ ] Frontend: Login funcional
- [ ] Frontend: Rutas protegidas
- [ ] Frontend: Sidebar dinámico
- [ ] Frontend: Página de usuarios
- [ ] Documentación actualizada
