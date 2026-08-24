from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas.user import LoginRequest, LoginResponse, UserResponse
from backend.services.auth import AuthService
from backend.models.user import User

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Login simple: verifica email y password en texto plano.
    """
    user = AuthService.authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o password incorrectos"
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
