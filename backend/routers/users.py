from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas.user import UserCreate, UserUpdate, UserResponse, UserListResponse
from backend.models.user import User

router = APIRouter()


@router.get("", response_model=UserListResponse)
def list_users(db: Session = Depends(get_db)):
    """
    Lista todos los usuarios.
    """
    users = db.query(User).order_by(User.id.desc()).all()
    return UserListResponse(
        total=len(users),
        users=[UserResponse.model_validate(u) for u in users]
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(request: UserCreate, db: Session = Depends(get_db)):
    """
    Crea un nuevo usuario.
    """
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un usuario con ese email"
        )

    if request.role not in ("admin", "empleado"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El rol debe ser 'admin' o 'empleado'"
        )

    user = User(
        nombre=request.nombre,
        email=request.email,
        password=request.password,
        role=request.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, request: UserUpdate, db: Session = Depends(get_db)):
    """
    Edita un usuario existente.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

    if request.email is not None:
        existing = db.query(User).filter(
            User.email == request.email,
            User.id != user_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe otro usuario con ese email"
            )

    if request.role is not None and request.role not in ("admin", "empleado"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El rol debe ser 'admin' o 'empleado'"
        )

    if request.nombre is not None:
        user.nombre = request.nombre
    if request.email is not None:
        user.email = request.email
    if request.role is not None:
        user.role = request.role
    if request.is_active is not None:
        user.is_active = request.is_active

    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """
    Elimina un usuario.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

    db.delete(user)
    db.commit()
    return {"message": f"Usuario {user_id} eliminado"}
