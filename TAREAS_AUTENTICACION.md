# TAREAS — Sistema de Roles y Autenticación

## Objetivo

Agregar control de acceso por roles a PolicyLens-AI:
- **Admin**: CRUD de documentos, usuarios y sincronización
- **Empleado**: Solo consultas en el chat RAG

---

## Tecnologías a agregar

| Paquete | Versión | Uso |
|---------|---------|-----|
| passlib[bcrypt] | 1.7.4 | Hashing de contraseñas |
| python-jose[cryptography] | 3.3.0 | Generación y verificación de JWT |

---

## Modelo de Datos

### Nueva tabla: users

```
User:
  id: int              (PK, autoincrement)
  nombre: str          (not null)
  email: str           (unique, not null)
  hashed_password: str (not null)
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

## Endpoints Nuevos

### Auth

| Método | Ruta | Descripción | Acceso |
|--------|------|-------------|--------|
| POST | `/auth/login` | Login, retorna JWT | Público |
| GET | `/auth/me` | Usuario autenticado | Cualquier rol |

### Usuarios

| Método | Ruta | Descripción | Acceso |
|--------|------|-------------|--------|
| GET | `/users` | Listar usuarios | Admin |
| POST | `/users` | Crear usuario | Admin |
| PUT | `/users/{id}` | Editar usuario | Admin |
| DELETE | `/users/{id}` | Eliminar usuario | Admin |

---

## Endpoints Existentes — Cambios de Acceso

| Endpoint | Acceso actual | Acceso nuevo |
|----------|--------------|--------------|
| POST /chat | Público | Cualquier rol |
| GET /chat/conversations | Público | Cualquier rol |
| GET /chat/conversations/{id} | Público | Cualquier rol |
| DELETE /chat/conversations/{id} | Público | Cualquier rol |
| GET /documents | Público | Admin |
| POST /documents/upload | Público | Admin |
| GET /documents/{id} | Público | Admin |
| DELETE /documents/{id} | Público | Admin |
| POST /documents/sync | Público | Admin |

---

## Flujo de Autenticación

```
1. Login
   POST /auth/login {email, password}
   → Verificar credenciales
   → Generar JWT con {user_id, role, exp}
   → Retornar {access_token, token_type, user}

2. Request protegido
   Header: Authorization: Bearer <token>
   → Backend decodifica JWT
   → Extrae user_id y role
   → Si no tiene permiso → 403 Forbidden
   → Si token inválido/expirado → 401 Unauthorized

3. Frontend
   → Guardar token en localStorage
   → Enviar token en cada request via interceptor
   → Si recibe 401 → limpiar token, redirigir a /login
```

---

# TAREAS POR INTEGRANTE

---

## INTEGRANTE 1: Backend & Core Engineer

**Responsable:** Modelos, autenticación, endpoints protegidos, hashing de contraseñas.

### Tarea 1: Dependencias

Agregar a `requirements.txt`:
```
passlib[bcrypt]==1.7.4
python-jose[cryptography]==3.3.0
```

Ejecutar:
```bash
pip install -r requirements.txt
```

---

### Tarea 2: Modelo de Usuario

**Archivo:** `backend/models/user.py` (nuevo)

Crear clase `User` con SQLAlchemy:

```python
class User(Base):
    __tablename__ = "users"

    id = mapped_column(Integer, primary_key=True, index=True)
    nombre = mapped_column(String, nullable=False)
    email = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password = mapped_column(String, nullable=False)
    role = mapped_column(String, nullable=False, default="empleado")
    is_active = mapped_column(Boolean, default=True)
    created_at = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
```

---

### Tarea 3: Schemas de Usuario

**Archivo:** `backend/schemas/user.py` (nuevo)

Crear schemas Pydantic:

| Schema | Campos |
|--------|--------|
| `UserCreate` | nombre, email, password (str plano), role |
| `UserUpdate` | nombre (opt), email (opt), role (opt) |
| `UserResponse` | id, nombre, email, role, is_active, created_at |
| `LoginRequest` | email, password |
| `LoginResponse` | access_token, token_type, user (UserResponse) |

---

### Tarea 4: Servicio de Auth

**Archivo:** `backend/services/auth.py` (nuevo)

Crear clase `AuthService` con métodos estáticos:

| Método | Parámetros | Retorna |
|--------|-----------|---------|
| `hash_password(password: str)` | contraseña en texto plano | hash bcrypt |
| `verify_password(plain: str, hashed: str)` | texto plano + hash | bool |
| `create_access_token(user_id: int, role: str)` | ID y rol del usuario | JWT string (exp: 24h) |
| `decode_access_token(token: str)` | token JWT | dict {user_id, role} |

Secret key: `os.getenv("JWT_SECRET", "clave-secreta-por-defecto-cambiar")`

---

### Tarea 5: Router de Auth

**Archivo:** `backend/routers/auth.py` (nuevo)

| Endpoint | Método | Lógica |
|----------|--------|--------|
| `/auth/login` | POST | Buscar usuario por email, verificar password, retornar JWT |
| `/auth/me` | GET | Requerir token, retornar usuario autenticado |

---

### Tarea 6: Router de Usuarios

**Archivo:** `backend/routers/users.py` (nuevo)

Todos los endpoints requieren role=admin.

| Endpoint | Método | Lógica |
|----------|--------|--------|
| `/users` | GET | Listar todos los usuarios |
| `/users` | POST | Crear usuario (hashear password antes de guardar) |
| `/users/{id}` | PUT | Editar usuario (campos opcionales) |
| `/users/{id}` | DELETE | Eliminar usuario |

---

### Tarea 7: Dependencia de Autenticación

**Archivo:** `backend/services/auth.py` (agregar)

Crear función dependencia `get_current_user`:
1. Leer header `Authorization: Bearer <token>`
2. Decodificar JWT
3. Buscar usuario en BD por user_id
4. Si no hay token → 401
5. Si token inválido → 401
6. Si usuario no existe o inactivo → 401
7. Retorna el usuario

Crear función dependencia `require_admin`:
1. Llamar a `get_current_user`
2. Si role != "admin" → 403

---

### Tarea 8: Proteger Endpoints Existentes

**Archivos a modificar:**

| Archivo | Cambio |
|---------|--------|
| `backend/routers/chat.py` | Agregar `user: User = Depends(get_current_user)` en POST /chat, GET /conversations, GET /conversations/{id}, DELETE /conversations/{id} |
| `backend/routers/documents.py` | Agregar `user: User = Depends(require_admin)` en TODOS los endpoints |
| `backend/routers/sync.py` | Agregar `user: User = Depends(require_admin)` en POST /sync |

---

### Tarea 9: Admin por Defecto

**Archivo:** `backend/main.py` (modificar)

En la función `lifespan`, después de `Base.metadata.create_all()`:
```python
from backend.models.user import User
from backend.services.auth import AuthService

db = SessionLocal()
admin = db.query(User).filter(User.role == "admin").first()
if not admin:
    db.add(User(
        nombre="Admin",
        email="admin@policylens.com",
        hashed_password=AuthService.hash_password("admin123"),
        role="admin"
    ))
    db.commit()
db.close()
```

---

### Tarea 10: Registrar Routers

**Archivo:** `backend/main.py` (modificar)

Agregar imports y registros:
```python
from backend.routers.auth import router as auth_router
from backend.routers.users import router as users_router

app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(users_router, prefix="/users", tags=["Users"])
```

---

### Tarea 11: Variable de Entorno

**Archivos a modificar:**

`.env` — agregar:
```
JWT_SECRET=politlens-ai-jwt-secret-2026-cambiar-en-produccion
```

`.env.example` — agregar:
```
JWT_SECRET=tu-clave-secreta-aqui
```

---

### Archivos del Integrante 1

| Tipo | Archivo |
|------|---------|
| Crear | `backend/models/user.py` |
| Crear | `backend/schemas/user.py` |
| Crear | `backend/services/auth.py` |
| Crear | `backend/routers/auth.py` |
| Crear | `backend/routers/users.py` |
| Modificar | `requirements.txt` |
| Modificar | `.env` |
| Modificar | `.env.example` |
| Modificar | `backend/main.py` |
| Modificar | `backend/routers/chat.py` |
| Modificar | `backend/routers/documents.py` |
| Modificar | `backend/routers/sync.py` |

---

## INTEGRANTE 2: Frontend & Integration Lead

**Responsable:** Login, rutas protegidas, sidebar dinámico, página de usuarios.

### Tarea 1: Servicio de Auth

**Archivo:** `frontend/src/services/auth.ts` (nuevo)

Crear funciones:

| Función | Llamada | Almacenamiento |
|---------|---------|----------------|
| `login(email, password)` | POST `/auth/login` | Guardar token en `localStorage` |
| `logout()` | — | Eliminar token de `localStorage` |
| `getUsuarioActual()` | GET `/auth/me` | — |
| `getToken()` | — | Leer token de `localStorage` |

---

### Tarea 2: Interceptor JWT

**Archivo:** `frontend/src/services/api.ts` (modificar)

Agregar interceptor de **request**:
```typescript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

Agregar en interceptor de **response** (error):
```typescript
if (error.response?.status === 401) {
  localStorage.removeItem('token')
  window.location.href = '/login'
}
```

---

### Tarea 3: Contexto de Autenticación

**Archivo:** `frontend/src/context/AuthContext.tsx` (nuevo)

Crear contexto que provea:

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `user` | `User \| null` | Usuario autenticado |
| `isAuthenticated` | `bool` | Hay token válido |
| `isAdmin` | `bool` | role === "admin" |
| `login(email, password)` | `Promise<void>` | Login y guardar token |
| `logout()` | `void` | Logout y limpiar token |

Al montar:
- Si hay token en localStorage → llamar GET `/auth/me` para validar
- Si token inválido → limpiar y redirigir a `/login`

---

### Tarea 4: Página de Login

**Archivo:** `frontend/src/pages/LoginPage.tsx` (nuevo)

Crear formulario con:
- Campo email (type email)
- Campo password (type password)
- Botón "Iniciar Sesión"
- Mensaje de error si falla
- Al exito → redirigir a `/chat`

Diseño: centrado, fondo neutro, card blanca con sombra.

---

### Tarea 5: Rutas Protegidas

**Archivo:** `frontend/src/App.tsx` (modificar)

Crear componente `ProtectedRoute`:
```typescript
function ProtectedRoute({ children, adminOnly = false }) {
  // Si no hay token → redirigir a /login
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

### Tarea 6: Sidebar Dinámico

**Archivo:** `frontend/src/components/Sidebar.tsx` (modificar)

| Rol | Items visibles |
|-----|----------------|
| Admin | Consultas, Documentos, Sincronización, Usuarios |
| Empleado | Solo Consultas |

Agregar abajo:
- Nombre del usuario
- Botón "Cerrar Sesión"

---

### Tarea 7: Servicio de Usuarios

**Archivo:** `frontend/src/services/users.ts` (nuevo)

| Función | Método | Endpoint |
|---------|--------|----------|
| `listarUsuarios()` | GET | `/users` |
| `crearUsuario(data)` | POST | `/users` |
| `editarUsuario(id, data)` | PUT | `/users/{id}` |
| `eliminarUsuario(id)` | DELETE | `/users/{id}` |

---

### Tarea 8: Página de Usuarios

**Archivo:** `frontend/src/pages/UsersPage.tsx` (nuevo)

Crear interfaz:
- Tabla con columnas: Nombre, Email, Rol, Estado, Fecha, Acciones
- Botón "Crear Usuario" → abre modal
- Botón editar → abre modal con datos
- Botón eliminar → confirmación
- Solo visible para admin

---

### Tarea 9: Modal de Usuarios

**Archivo:** `frontend/src/components/UserModal.tsx` (nuevo)

Crear modal con formulario:
- Campo nombre
- Campo email
- Campo password (solo al crear, no al editar)
- Select de rol (admin / empleado)
- Botón Guardar / Cancelar

---

### Tarea 10: Layout Actualizado

**Archivo:** `frontend/src/components/Layout.tsx` (modificar)

- Si no está autenticado → renderizar solo `<Outlet />` sin sidebar
- Si está autenticado → renderizar sidebar + outlet
- En móvil: sidebar colapsable

---

### Archivos del Integrante 2

| Tipo | Archivo |
|------|---------|
| Crear | `frontend/src/services/auth.ts` |
| Crear | `frontend/src/services/users.ts` |
| Crear | `frontend/src/context/AuthContext.tsx` |
| Crear | `frontend/src/pages/LoginPage.tsx` |
| Crear | `frontend/src/pages/UsersPage.tsx` |
| Crear | `frontend/src/components/UserModal.tsx` |
| Modificar | `frontend/src/services/api.ts` |
| Modificar | `frontend/src/App.tsx` |
| Modificar | `frontend/src/components/Sidebar.tsx` |
| Modificar | `frontend/src/components/Layout.tsx` |

---

## INTEGRANTE 3: AI & Data Pipeline Architect

**Responsable:** Integración auth + RAG, documentación, pruebas, verificación.

### Tarea 1: Verificar Pipeline RAG + Auth

Verificar que:
- `POST /chat` funciona con el middleware de autenticación
- `RAGService.preguntar()` no se ve afectado por el cambio
- Las conversaciones se guardan correctamente

---

### Tarea 2: Guardar usuario en conversaciones (Opcional)

**Archivos a modificar:**

`backend/models/conversation.py` — agregar campo:
```python
user_id: Mapped[Optional[int]] = mapped_column(
    Integer, ForeignKey("users.id"), nullable=True
)
```

`backend/services/rag.py` — en método `preguntar()`:
- Recibir `user_id` como parámetro
- Guardarlo en la conversación

`backend/routers/chat.py`:
- `GET /chat/conversations` → filtrar por usuario (admin ve todas)
- `GET /chat/conversations/{id}` → verificar propiedad (admin ve todas)

---

### Tarea 3: Verificar Protección de Endpoints

Probar con curl o Thunder Client:

```bash
# Sin token → debe retornar 401
curl -X POST http://localhost:8000/chat -H "Content-Type: application/json" -d '{"question":"test"}'

# Con token de empleado → debe funcionar en chat
TOKEN_EMPLEADO="..."
curl -X POST http://localhost:8000/chat -H "Authorization: Bearer $TOKEN_EMPLEADO" -H "Content-Type: application/json" -d '{"question":"test"}'

# Con token de empleado → debe retornar 403 en documentos
curl -X GET http://localhost:8000/documents -H "Authorization: Bearer $TOKEN_EMPLEADO"

# Con token de admin → debe funcionar en todo
TOKEN_ADMIN="..."
curl -X GET http://localhost:8000/documents -H "Authorization: Bearer $TOKEN_ADMIN"
```

---

### Tarea 4: Verificar Frontend

Verificar que:
- El login funciona correctamente
- El JWT se envía en todas las peticiones
- El admin ve todas las páginas
- El empleado solo ve chat
- El 401 redirige al login
- El sidebar es dinámico según el rol

---

### Tarea 5: Documentación

**Archivos a modificar:**

`README.md`:
- Sección de autenticación
- Credenciales del admin por defecto
- Endpoints protegidos y sus roles
- Flujo de login

`CONTEXTO_GENERAL.md`:
- Nuevo modelo User
- Nuevos endpoints de auth y users
- Sistema de roles

---

### Tarea 6: Verificar Variables de Entorno

Verificar que:
- `.env` tiene `JWT_SECRET`
- `.env.example` tiene `JWT_SECRET` como ejemplo
- `.gitignore` incluye `.env`

---

### Archivos del Integrante 3

| Tipo | Archivo |
|------|---------|
| Modificar (opcional) | `backend/models/conversation.py` |
| Modificar (opcional) | `backend/services/rag.py` |
| Modificar | `README.md` |
| Modificar | `CONTEXTO_GENERAL.md` |
| Verificar | `.env` |
| Verificar | `.env.example` |
| Verificar | `.gitignore` |

---

# ORDEN DE IMPLEMENTACIÓN RECOMENDADO

```
Fase 1 (Backend primero):
  Tareas 1-11 del Integrante 1
  → Verificar que auth funciona con curl

Fase 2 (Frontend después):
  Tareas 1-10 del Integrante 2
  → Verificar login y rutas funcionan

Fase 3 (Integración y pruebas):
  Tareas 1-6 del Integrante 3
  → Verificar todo el flujo completo
```

---

# VERIFICACIÓN FINAL

El sistema debe cumplir:

- [ ] Login funcional con JWT
- [ ] Admin puede CRUD documentos
- [ ] Admin puede CRUD usuarios
- [ ] Admin puede sincronizar
- [ ] Empleado solo puede hacer consultas
- [ ] Sidebar dinámico según rol
- [ ] 401 redirige al login
- [ ] 403 deniega acceso no autorizado
- [ ] Admin por defecto se crea automáticamente
- [ ] Contraseñas hasheadas con bcrypt
- [ ] JWT expira en 24 horas
