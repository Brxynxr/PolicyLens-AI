from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from backend.database import get_db
from backend.schemas.user import LoginRequest, LoginResponse, UserResponse
from backend.services.auth import AuthService
from backend.services.audit import AuditService
from backend.models.user import User

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/login", response_model=LoginResponse)
@limiter.limit("10/minute")
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    """
    Login simple: verifica email y password.
    Limitado a 10 intentos por minuto por IP.
    """
    ip = request.client.host if request.client else None
    user = AuthService.authenticate_user(db, body.email, body.password)
    if not user:
        AuditService.registrar_evento(
            db=db,
            action="LOGIN_FAILED",
            resource="/auth/login",
            user_email=body.email,
            ip_address=ip,
            status="FAILED",
            details="Credenciales incorrectas o usuario inactivo"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o password incorrectos"
        )

    AuditService.registrar_evento(
        db=db,
        action="LOGIN_SUCCESS",
        resource="/auth/login",
        user_id=user.id,
        user_email=user.email,
        ip_address=ip,
        status="SUCCESS"
    )

    return LoginResponse(
        user=UserResponse.model_validate(user),
        message="Login exitoso"
    )



@router.get("/me", response_model=UserResponse)
def get_me(user_id: int = Query(...), db: Session = Depends(get_db)):
    """
    Obtiene usuario por ID (simulación de usuario autenticado).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    return UserResponse.model_validate(user)
